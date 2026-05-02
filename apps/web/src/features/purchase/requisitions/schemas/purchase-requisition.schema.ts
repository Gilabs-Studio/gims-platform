import { z } from "zod";

const uuidLikeRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidLike = () => z.string().regex(uuidLikeRegex);

export const purchaseRequisitionItemSchema = z.object({
	product_id: uuidLike(),
	quantity: z.coerce.number().positive(),
	purchase_price: z.coerce.number().nonnegative(),
	discount: z.coerce.number().min(0).max(100).optional().default(0),
	notes: z.string().optional().nullable(),
});

export function getPurchaseRequisitionSchema() {
	return z.object({
		supplier_id: uuidLike(),
		supplier_contact_id: uuidLike().optional().nullable(),
		payment_terms_id: uuidLike().nullable().refine((v) => v != null && v !== "", { message: "Payment terms is required" }),
		business_unit_id: uuidLike().optional().nullable(),
		employee_id: uuidLike().optional().nullable(),

		request_date: z.string().min(1).refine((val) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return new Date(val) >= today;
		}, "Requisition date cannot be in the past"),
		address: z.string().optional().nullable(),
		notes: z.string().optional().default(""),

		tax_rate: z.coerce.number().min(0).max(100).optional().default(0),
		delivery_cost: z.coerce.number().min(0).optional().default(0),
		other_cost: z.coerce.number().min(0).optional().default(0),

		items: z.array(purchaseRequisitionItemSchema).min(1),
	});
}

export type PurchaseRequisitionFormData = z.infer<ReturnType<typeof getPurchaseRequisitionSchema>>;
