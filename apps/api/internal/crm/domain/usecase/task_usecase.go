package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
)

// TaskUsecase defines business logic for CRM tasks
type TaskUsecase interface {
	Create(ctx context.Context, req dto.CreateTaskRequest, createdBy string) (dto.TaskResponse, error)
	GetByID(ctx context.Context, id string) (dto.TaskResponse, error)
	List(ctx context.Context, params repositories.TaskListParams) ([]dto.TaskResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateTaskRequest) (dto.TaskResponse, error)
	Delete(ctx context.Context, id string) error
	Assign(ctx context.Context, id string, req dto.AssignTaskRequest, assignedFrom string) (dto.TaskResponse, error)
	Complete(ctx context.Context, id string) (dto.TaskResponse, error)
	MarkInProgress(ctx context.Context, id string) (dto.TaskResponse, error)
	GetFormData(ctx context.Context) (*dto.TaskFormDataResponse, error)
	// Reminder nested CRUD
	ListReminders(ctx context.Context, taskID string) ([]dto.ReminderResponse, error)
	GetReminderByID(ctx context.Context, taskID string, reminderID string) (dto.ReminderResponse, error)
	CreateReminder(ctx context.Context, taskID string, req dto.CreateReminderRequest, createdBy string) (dto.ReminderResponse, error)
	UpdateReminder(ctx context.Context, taskID string, reminderID string, req dto.UpdateReminderRequest) (dto.ReminderResponse, error)
	DeleteReminder(ctx context.Context, taskID string, reminderID string) error
}

type taskUsecase struct {
	taskRepo     repositories.TaskRepository
	reminderRepo repositories.ReminderRepository
	contactRepo  repositories.ContactRepository
	dealRepo     repositories.DealRepository
	customerRepo customerRepos.CustomerRepository
	employeeRepo orgRepos.EmployeeRepository
}

// NewTaskUsecase creates a new task usecase
func NewTaskUsecase(
	taskRepo repositories.TaskRepository,
	reminderRepo repositories.ReminderRepository,
	contactRepo repositories.ContactRepository,
	dealRepo repositories.DealRepository,
	customerRepo customerRepos.CustomerRepository,
	employeeRepo orgRepos.EmployeeRepository,
) TaskUsecase {
	return &taskUsecase{
		taskRepo: taskRepo, reminderRepo: reminderRepo,
		contactRepo: contactRepo, dealRepo: dealRepo,
		customerRepo: customerRepo, employeeRepo: employeeRepo,
	}
}

func (u *taskUsecase) Create(ctx context.Context, req dto.CreateTaskRequest, createdBy string) (dto.TaskResponse, error) {
	// Validate FK references
	if req.AssignedTo != nil && *req.AssignedTo != "" {
		if _, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo); err != nil {
			return dto.TaskResponse{}, errors.New("assigned employee not found")
		}
	}
	if req.CustomerID != nil && *req.CustomerID != "" {
		if _, err := u.customerRepo.FindByID(ctx, *req.CustomerID); err != nil {
			return dto.TaskResponse{}, errors.New("customer not found")
		}
	}
	if req.ContactID != nil && *req.ContactID != "" {
		if _, err := u.contactRepo.FindByID(ctx, *req.ContactID); err != nil {
			return dto.TaskResponse{}, errors.New("contact not found")
		}
	}
	if req.DealID != nil && *req.DealID != "" {
		if _, err := u.dealRepo.FindByID(ctx, *req.DealID); err != nil {
			return dto.TaskResponse{}, errors.New("deal not found")
		}
	}

	// Parse due date
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		t, err := time.Parse("2006-01-02", *req.DueDate)
		if err != nil {
			return dto.TaskResponse{}, errors.New("invalid due_date format, use YYYY-MM-DD")
		}
		dueDate = &t
	}

	taskType := "general"
	if req.Type != "" {
		taskType = req.Type
	}
	priority := "medium"
	if req.Priority != "" {
		priority = req.Priority
	}

	task := &models.Task{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		Type:        taskType,
		Status:      string(models.TaskStatusPending),
		Priority:    priority,
		DueDate:     dueDate,
		AssignedTo:  req.AssignedTo,
		CustomerID:  req.CustomerID,
		ContactID:   req.ContactID,
		DealID:      req.DealID,
		CreatedBy:   &createdBy,
	}

	if err := u.taskRepo.Create(ctx, task); err != nil {
		return dto.TaskResponse{}, fmt.Errorf("failed to create task: %w", err)
	}

	created, err := u.taskRepo.FindByID(ctx, task.ID)
	if err != nil {
		return dto.TaskResponse{}, err
	}
	return mapper.ToTaskResponse(created), nil
}

func (u *taskUsecase) GetByID(ctx context.Context, id string) (dto.TaskResponse, error) {
	task, err := u.taskRepo.FindByID(ctx, id)
	if err != nil {
		return dto.TaskResponse{}, errors.New("task not found")
	}
	return mapper.ToTaskResponse(task), nil
}

func (u *taskUsecase) List(ctx context.Context, params repositories.TaskListParams) ([]dto.TaskResponse, int64, error) {
	tasks, total, err := u.taskRepo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToTaskResponseList(tasks), total, nil
}

func (u *taskUsecase) Update(ctx context.Context, id string, req dto.UpdateTaskRequest) (dto.TaskResponse, error) {
	task, err := u.taskRepo.FindByID(ctx, id)
	if err != nil {
		return dto.TaskResponse{}, errors.New("task not found")
	}

	// Cannot update cancelled tasks
	if task.Status == string(models.TaskStatusCancelled) {
		return dto.TaskResponse{}, errors.New("cannot update a cancelled task")
	}

	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = *req.Description
	}
	if req.Type != nil {
		task.Type = *req.Type
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			task.DueDate = nil
		} else {
			t, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				return dto.TaskResponse{}, errors.New("invalid due_date format, use YYYY-MM-DD")
			}
			task.DueDate = &t
		}
	}
	if req.AssignedTo != nil {
		if *req.AssignedTo != "" {
			if _, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo); err != nil {
				return dto.TaskResponse{}, errors.New("assigned employee not found")
			}
		}
		task.AssignedTo = req.AssignedTo
	}
	if req.CustomerID != nil {
		task.CustomerID = req.CustomerID
	}
	if req.ContactID != nil {
		task.ContactID = req.ContactID
	}
	if req.DealID != nil {
		task.DealID = req.DealID
	}

	if err := u.taskRepo.Update(ctx, task); err != nil {
		return dto.TaskResponse{}, fmt.Errorf("failed to update task: %w", err)
	}

	updated, err := u.taskRepo.FindByID(ctx, task.ID)
	if err != nil {
		return dto.TaskResponse{}, err
	}
	return mapper.ToTaskResponse(updated), nil
}

func (u *taskUsecase) Delete(ctx context.Context, id string) error {
	if _, err := u.taskRepo.FindByID(ctx, id); err != nil {
		return errors.New("task not found")
	}
	return u.taskRepo.Delete(ctx, id)
}

func (u *taskUsecase) Assign(ctx context.Context, id string, req dto.AssignTaskRequest, assignedFrom string) (dto.TaskResponse, error) {
	task, err := u.taskRepo.FindByID(ctx, id)
	if err != nil {
		return dto.TaskResponse{}, errors.New("task not found")
	}

	if task.Status == string(models.TaskStatusCancelled) {
		return dto.TaskResponse{}, errors.New("cannot assign a cancelled task")
	}

	if _, err := u.employeeRepo.FindByID(ctx, req.AssignedTo); err != nil {
		return dto.TaskResponse{}, errors.New("assigned employee not found")
	}

	task.AssignedTo = &req.AssignedTo
	task.AssignedFrom = &assignedFrom

	if err := u.taskRepo.Update(ctx, task); err != nil {
		return dto.TaskResponse{}, fmt.Errorf("failed to assign task: %w", err)
	}

	updated, err := u.taskRepo.FindByID(ctx, task.ID)
	if err != nil {
		return dto.TaskResponse{}, err
	}
	return mapper.ToTaskResponse(updated), nil
}

func (u *taskUsecase) Complete(ctx context.Context, id string) (dto.TaskResponse, error) {
	task, err := u.taskRepo.FindByID(ctx, id)
	if err != nil {
		return dto.TaskResponse{}, errors.New("task not found")
	}

	if task.Status == string(models.TaskStatusCancelled) {
		return dto.TaskResponse{}, errors.New("cannot complete a cancelled task")
	}
	if task.Status == string(models.TaskStatusCompleted) {
		return dto.TaskResponse{}, errors.New("task is already completed")
	}

	now := time.Now()
	task.Status = string(models.TaskStatusCompleted)
	task.CompletedAt = &now

	if err := u.taskRepo.Update(ctx, task); err != nil {
		return dto.TaskResponse{}, fmt.Errorf("failed to complete task: %w", err)
	}

	updated, err := u.taskRepo.FindByID(ctx, task.ID)
	if err != nil {
		return dto.TaskResponse{}, err
	}
	return mapper.ToTaskResponse(updated), nil
}

func (u *taskUsecase) MarkInProgress(ctx context.Context, id string) (dto.TaskResponse, error) {
	task, err := u.taskRepo.FindByID(ctx, id)
	if err != nil {
		return dto.TaskResponse{}, errors.New("task not found")
	}

	if task.Status == string(models.TaskStatusCancelled) {
		return dto.TaskResponse{}, errors.New("cannot reopen a cancelled task")
	}
	if task.Status == string(models.TaskStatusCompleted) {
		return dto.TaskResponse{}, errors.New("cannot reopen a completed task")
	}

	task.Status = string(models.TaskStatusInProgress)

	if err := u.taskRepo.Update(ctx, task); err != nil {
		return dto.TaskResponse{}, fmt.Errorf("failed to mark task in progress: %w", err)
	}

	updated, err := u.taskRepo.FindByID(ctx, task.ID)
	if err != nil {
		return dto.TaskResponse{}, err
	}
	return mapper.ToTaskResponse(updated), nil
}

func (u *taskUsecase) GetFormData(ctx context.Context) (*dto.TaskFormDataResponse, error) {
	// Fetch employees
	employees, _, err := u.employeeRepo.List(ctx, orgRepos.EmployeeListParams{
		Page: 1, PerPage: 500, SortBy: "name", SortDir: "ASC",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}
	employeeOptions := make([]dto.TaskEmployeeOption, 0, len(employees))
	for _, emp := range employees {
		employeeOptions = append(employeeOptions, dto.TaskEmployeeOption{
			ID: emp.ID, EmployeeCode: emp.EmployeeCode, Name: emp.Name,
		})
	}

	// Fetch customers
	customers, _, err := u.customerRepo.List(ctx, customerRepos.CustomerListParams{
		ListParams: customerRepos.ListParams{Search: "", SortBy: "name", SortDir: "ASC", Limit: 500},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customers: %w", err)
	}
	customerOptions := make([]dto.TaskCustomerOption, 0, len(customers))
	for _, cust := range customers {
		customerOptions = append(customerOptions, dto.TaskCustomerOption{
			ID: cust.ID, Code: cust.Code, Name: cust.Name,
		})
	}

	// Fetch contacts
	contacts, _, err := u.contactRepo.List(ctx, repositories.ContactListParams{
		ListParams: repositories.ListParams{SortBy: "name", SortDir: "ASC", Limit: 500},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch contacts: %w", err)
	}
	contactOptions := make([]dto.TaskContactOption, 0, len(contacts))
	for _, c := range contacts {
		contactOptions = append(contactOptions, dto.TaskContactOption{
			ID: c.ID, Name: c.Name, Email: c.Email,
		})
	}

	// Fetch deals
	deals, _, err := u.dealRepo.List(ctx, repositories.DealListParams{Limit: 500, SortBy: "created_at", SortDir: "DESC"})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch deals: %w", err)
	}
	dealOptions := make([]dto.TaskDealOption, 0, len(deals))
	for _, d := range deals {
		dealOptions = append(dealOptions, dto.TaskDealOption{
			ID: d.ID, Code: d.Code, Name: d.Title,
		})
	}

	return &dto.TaskFormDataResponse{
		Employees: employeeOptions,
		Customers: customerOptions,
		Contacts:  contactOptions,
		Deals:     dealOptions,
	}, nil
}

// --- Reminder nested CRUD ---

func (u *taskUsecase) ListReminders(ctx context.Context, taskID string) ([]dto.ReminderResponse, error) {
	if _, err := u.taskRepo.FindByID(ctx, taskID); err != nil {
		return nil, errors.New("task not found")
	}
	reminders, err := u.reminderRepo.FindByTaskID(ctx, taskID)
	if err != nil {
		return nil, err
	}
	return mapper.ToReminderResponseList(reminders), nil
}

func (u *taskUsecase) GetReminderByID(ctx context.Context, taskID string, reminderID string) (dto.ReminderResponse, error) {
	if _, err := u.taskRepo.FindByID(ctx, taskID); err != nil {
		return dto.ReminderResponse{}, errors.New("task not found")
	}
	reminder, err := u.reminderRepo.FindByID(ctx, reminderID)
	if err != nil {
		return dto.ReminderResponse{}, errors.New("reminder not found")
	}
	if reminder.TaskID != taskID {
		return dto.ReminderResponse{}, errors.New("reminder does not belong to this task")
	}
	return mapper.ToReminderResponse(reminder), nil
}

func (u *taskUsecase) CreateReminder(ctx context.Context, taskID string, req dto.CreateReminderRequest, createdBy string) (dto.ReminderResponse, error) {
	if _, err := u.taskRepo.FindByID(ctx, taskID); err != nil {
		return dto.ReminderResponse{}, errors.New("task not found")
	}

	remindAt, err := time.Parse(time.RFC3339, req.RemindAt)
	if err != nil {
		return dto.ReminderResponse{}, errors.New("invalid remind_at format, use ISO 8601")
	}

	reminderType := "in_app"
	if req.ReminderType != "" {
		reminderType = req.ReminderType
	}

	reminder := &models.Reminder{
		ID:           uuid.New().String(),
		TaskID:       taskID,
		RemindAt:     remindAt,
		ReminderType: reminderType,
		Message:      req.Message,
		CreatedBy:    &createdBy,
	}

	if err := u.reminderRepo.Create(ctx, reminder); err != nil {
		return dto.ReminderResponse{}, fmt.Errorf("failed to create reminder: %w", err)
	}

	return mapper.ToReminderResponse(reminder), nil
}

func (u *taskUsecase) UpdateReminder(ctx context.Context, taskID string, reminderID string, req dto.UpdateReminderRequest) (dto.ReminderResponse, error) {
	if _, err := u.taskRepo.FindByID(ctx, taskID); err != nil {
		return dto.ReminderResponse{}, errors.New("task not found")
	}

	reminder, err := u.reminderRepo.FindByID(ctx, reminderID)
	if err != nil {
		return dto.ReminderResponse{}, errors.New("reminder not found")
	}
	if reminder.TaskID != taskID {
		return dto.ReminderResponse{}, errors.New("reminder does not belong to this task")
	}

	if req.RemindAt != nil {
		t, err := time.Parse(time.RFC3339, *req.RemindAt)
		if err != nil {
			return dto.ReminderResponse{}, errors.New("invalid remind_at format, use ISO 8601")
		}
		reminder.RemindAt = t
	}
	if req.ReminderType != nil {
		reminder.ReminderType = *req.ReminderType
	}
	if req.Message != nil {
		reminder.Message = *req.Message
	}

	if err := u.reminderRepo.Update(ctx, reminder); err != nil {
		return dto.ReminderResponse{}, fmt.Errorf("failed to update reminder: %w", err)
	}

	return mapper.ToReminderResponse(reminder), nil
}

func (u *taskUsecase) DeleteReminder(ctx context.Context, taskID string, reminderID string) error {
	if _, err := u.taskRepo.FindByID(ctx, taskID); err != nil {
		return errors.New("task not found")
	}

	reminder, err := u.reminderRepo.FindByID(ctx, reminderID)
	if err != nil {
		return errors.New("reminder not found")
	}
	if reminder.TaskID != taskID {
		return errors.New("reminder does not belong to this task")
	}

	return u.reminderRepo.Delete(ctx, reminderID)
}
