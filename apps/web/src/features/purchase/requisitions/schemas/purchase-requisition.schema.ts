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
		supplier_id: uuidLike().optional().nullable(),
		supplier_phone_number_id: uuidLike().optional().nullable(),
		payment_terms_id: uuidLike().optional().nullable(),
		business_unit_id: uuidLike().optional().nullable(),
		employee_id: uuidLike().optional().nullable(),

		request_date: z.string().min(1),
		address: z.string().optional().nullable(),
		notes: z.string().optional().default(""),

		tax_rate: z.coerce.number().min(0).max(100).optional().default(0),
		delivery_cost: z.coerce.number().min(0).optional().default(0),
		other_cost: z.coerce.number().min(0).optional().default(0),

		items: z.array(purchaseRequisitionItemSchema).min(1),
	});
}

export type PurchaseRequisitionFormData = z.infer<ReturnType<typeof getPurchaseRequisitionSchema>>;
