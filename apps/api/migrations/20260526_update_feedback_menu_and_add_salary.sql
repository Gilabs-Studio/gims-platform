-- Migration: 20260526_update_feedback_menu_and_add_salary.sql
-- Author: antigravity
-- Purpose: Correct feedback permission mappings and introduce salary structure menu & permissions
-- Rollback: -- Restores previous menu associations and removes salary permissions if needed

DO $$
DECLARE
    v_pos_menu_id UUID;
    v_feedback_menu_id UUID;
    v_hrd_menu_id UUID;
    v_salary_menu_id UUID;
    v_response_menu_id UUID;
    v_forms_menu_id UUID;
BEGIN
    -- 1. Ensure POS root menu exists and get its ID
    SELECT id INTO v_pos_menu_id FROM menus WHERE url = '/pos' AND deleted_at IS NULL LIMIT 1;
    IF v_pos_menu_id IS NULL THEN
        v_pos_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_pos_menu_id, 'POS', 'store', '/pos', 12, 'active', 'core', 'pos', false, true, true, NOW(), NOW());
    END IF;

    -- 2. Ensure Feedback parent menu exists and get its ID
    SELECT id INTO v_feedback_menu_id FROM menus WHERE url = '/pos/feedback' AND deleted_at IS NULL LIMIT 1;
    IF v_feedback_menu_id IS NULL THEN
        v_feedback_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, parent_id, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_feedback_menu_id, 'Feedback', 'message-square-heart', '/pos/feedback', v_pos_menu_id, 3, 'active', 'pos', 'pos.feedback', false, true, true, NOW(), NOW());
    END IF;

    -- 3. Ensure Feedback Responses grandchild menu exists and get its ID
    SELECT id INTO v_response_menu_id FROM menus WHERE url = '/pos/feedback/response' AND deleted_at IS NULL LIMIT 1;
    IF v_response_menu_id IS NULL THEN
        v_response_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, parent_id, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_response_menu_id, 'Feedback Responses', 'message-circle', '/pos/feedback/response', v_feedback_menu_id, 1, 'active', 'pos', 'pos.feedback.response', true, true, true, NOW(), NOW());
    END IF;

    -- 4. Ensure Form Builder grandchild menu exists and get its ID
    SELECT id INTO v_forms_menu_id FROM menus WHERE url = '/pos/feedback/forms' AND deleted_at IS NULL LIMIT 1;
    IF v_forms_menu_id IS NULL THEN
        v_forms_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, parent_id, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_forms_menu_id, 'Form Builder', 'clipboard-pen', '/pos/feedback/forms', v_feedback_menu_id, 2, 'active', 'pos', 'pos.feedback.forms', true, true, true, NOW(), NOW());
    END IF;

    -- 5. Ensure HRD root menu exists and get its ID
    SELECT id INTO v_hrd_menu_id FROM menus WHERE url = '/hrd' AND deleted_at IS NULL LIMIT 1;
    IF v_hrd_menu_id IS NULL THEN
        v_hrd_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_hrd_menu_id, 'HRD', 'users', '/hrd', 7, 'active', 'hrd', 'hrd', false, true, true, NOW(), NOW());
    END IF;

    -- 6. Ensure Salary Structures child menu exists and get its ID
    SELECT id INTO v_salary_menu_id FROM menus WHERE url = '/hrd/salary-structures' AND deleted_at IS NULL LIMIT 1;
    IF v_salary_menu_id IS NULL THEN
        v_salary_menu_id := gen_random_uuid();
        INSERT INTO menus (id, name, icon, url, parent_id, "order", status, module, slug, access, is_active, is_clickable, created_at, updated_at)
        VALUES (v_salary_menu_id, 'Salary Structures', 'wallet', '/hrd/salary-structures', v_hrd_menu_id, 9, 'active', 'hrd', 'hrd.salary-structures', true, true, true, NOW(), NOW());
    END IF;
END $$;

-- 7. Update existing feedback permissions to map to the new submenus
UPDATE permissions
SET menu_id = (SELECT id FROM menus WHERE url = '/pos/feedback/response' AND deleted_at IS NULL LIMIT 1),
    updated_at = NOW()
WHERE code = 'feedback.read' AND deleted_at IS NULL;

UPDATE permissions
SET menu_id = (SELECT id FROM menus WHERE url = '/pos/feedback/forms' AND deleted_at IS NULL LIMIT 1),
    updated_at = NOW()
WHERE code IN ('feedback.create', 'feedback.update', 'feedback.delete') AND deleted_at IS NULL;

-- 8. Seed salary permissions and associate with roles
DO $$
DECLARE
    v_salary_menu_id UUID;
    v_perm_id UUID;
    v_role_id UUID;
    v_perm_record RECORD;
BEGIN
    SELECT id INTO v_salary_menu_id FROM menus WHERE url = '/hrd/salary-structures' AND deleted_at IS NULL LIMIT 1;

    IF v_salary_menu_id IS NOT NULL THEN
        -- View permission
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'salary.read' AND deleted_at IS NULL) THEN
            INSERT INTO permissions (id, name, code, menu_id, resource, action, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'View Salary Structures', 'salary.read', v_salary_menu_id, 'salary', 'VIEW', 'View Salary Structures', NOW(), NOW());
        END IF;

        -- Create permission
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'salary.create' AND deleted_at IS NULL) THEN
            INSERT INTO permissions (id, name, code, menu_id, resource, action, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'Create Salary Structures', 'salary.create', v_salary_menu_id, 'salary', 'CREATE', 'Create Salary Structures', NOW(), NOW());
        END IF;

        -- Update permission
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'salary.update' AND deleted_at IS NULL) THEN
            INSERT INTO permissions (id, name, code, menu_id, resource, action, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'Edit Salary Structures', 'salary.update', v_salary_menu_id, 'salary', 'EDIT', 'Edit Salary Structures', NOW(), NOW());
        END IF;

        -- Delete permission
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'salary.delete' AND deleted_at IS NULL) THEN
            INSERT INTO permissions (id, name, code, menu_id, resource, action, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'Delete Salary Structures', 'salary.delete', v_salary_menu_id, 'salary', 'DELETE', 'Delete Salary Structures', NOW(), NOW());
        END IF;

        -- Approve permission
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'salary.approve' AND deleted_at IS NULL) THEN
            INSERT INTO permissions (id, name, code, menu_id, resource, action, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'Approve Salary Structures', 'salary.approve', v_salary_menu_id, 'salary', 'APPROVE', 'Approve Salary Structures', NOW(), NOW());
        END IF;

        -- Assign permissions to Admin
        SELECT id INTO v_role_id FROM roles WHERE code = 'admin' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'ALL')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL';
            END LOOP;
        END IF;

        -- Assign salary.read to Viewer
        SELECT id INTO v_role_id FROM roles WHERE code = 'viewer' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            SELECT id INTO v_perm_id FROM permissions WHERE code = 'salary.read' AND deleted_at IS NULL LIMIT 1;
            IF v_perm_id IS NOT NULL THEN
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_id, 'OWN')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'OWN';
            END IF;
        END IF;

        -- Assign permissions to Manager
        SELECT id INTO v_role_id FROM roles WHERE code = 'manager' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'ALL')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL';
            END LOOP;
        END IF;

        -- Assign permissions to Staff
        SELECT id INTO v_role_id FROM roles WHERE code = 'staff' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'ALL')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL';
            END LOOP;
        END IF;

        -- Assign permissions to Finance Manager
        SELECT id INTO v_role_id FROM roles WHERE code = 'finance_manager' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'ALL')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL';
            END LOOP;
        END IF;

        -- Assign permissions to Accountant
        SELECT id INTO v_role_id FROM roles WHERE code = 'accountant' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'OWN')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'OWN';
            END LOOP;
        END IF;

        -- Assign permissions to Area Supervisor
        SELECT id INTO v_role_id FROM roles WHERE code = 'area_supervisor' LIMIT 1;
        IF v_role_id IS NOT NULL THEN
            FOR v_perm_record IN SELECT id FROM permissions WHERE code LIKE 'salary.%' AND deleted_at IS NULL LOOP
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (v_role_id, v_perm_record.id, 'ALL')
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL';
            END LOOP;
        END IF;
    END IF;
END $$;
