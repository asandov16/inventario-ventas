
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "actor_id": string | null,"amount": number | null,"business_id": string,"created_at": string,"data": NonNullable<Json>,"entity": string,"entity_id": string,"id": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"amount"?: number | null,"business_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"entity": string,"entity_id": string,"id"?: never,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"amount"?: number | null,"business_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string,"id"?: never,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "created_at": string,"id": string,"last_folio": number,"name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"last_folio"?: number,"name": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"last_folio"?: number,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"business_id": string,"created_at": string,"id": string,"last_seq": number,"name": string,"prefix": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"business_id": string,"created_at"?: string,"id"?: string,"last_seq"?: number,"name": string,"prefix": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"created_at"?: string,"id"?: string,"last_seq"?: number,"name"?: string,"prefix"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by": string | null,"email": string | null,"id": string,"name": string,"notes": string | null,"phone_e164": string,"updated_at": string,"whatsapp_opt_in": boolean,"whatsapp_opt_in_at": string | null,"zone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"phone_e164": string,"updated_at"?: string,"whatsapp_opt_in"?: boolean,"whatsapp_opt_in_at"?: string | null,"zone"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"phone_e164"?: string,"updated_at"?: string,"whatsapp_opt_in"?: boolean,"whatsapp_opt_in_at"?: string | null,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"installments": {
                  Row: {
                    "amount": number,"due_date": string,"id": string,"number": number,"sale_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"due_date": string,"id"?: string,"number": number,"sale_id": string
                  }
                  Update: {
                    "amount"?: number,"due_date"?: string,"id"?: string,"number"?: number,"sale_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"inventory_movement_costs": {
                  Row: {
                    "movement_id": string,"unit_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "movement_id": string,"unit_cost": number
                  }
                  Update: {
                    "movement_id"?: string,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movement_costs_movement_id_fkey"
      columns: ["movement_id"]
isOneToOne: true
      referencedRelation: "inventory_movements"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "business_id": string,"created_at": string,"created_by": string | null,"id": string,"idempotency_key": string | null,"product_id": string,"qty_delta": number,"reason": string | null,"sale_id": string | null,"stock_after": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"idempotency_key"?: string | null,"product_id": string,"qty_delta": number,"reason"?: string | null,"sale_id"?: string | null,"stock_after": number,"type": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"idempotency_key"?: string | null,"product_id"?: string,"qty_delta"?: number,"reason"?: string | null,"sale_id"?: string | null,"stock_after"?: number,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "attempts": number,"business_id": string,"channel": string,"created_at": string,"id": string,"last_error": string | null,"payload": NonNullable<Json>,"recipient_e164": string,"sent_at": string | null,"status": string,"template": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"business_id": string,"channel": string,"created_at"?: string,"id"?: string,"last_error"?: string | null,"payload"?: NonNullable<Json>,"recipient_e164": string,"sent_at"?: string | null,"status": string,"template": string,"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"business_id"?: string,"channel"?: string,"created_at"?: string,"id"?: string,"last_error"?: string | null,"payload"?: NonNullable<Json>,"recipient_e164"?: string,"sent_at"?: string | null,"status"?: string,"template"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_methods": {
                  Row: {
                    "active": boolean,"business_id": string,"created_at": string,"id": string,"name": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"business_id": string,"created_at"?: string,"id"?: string,"name": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"created_at"?: string,"id"?: string,"name"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_methods_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"business_id": string,"client_created_at": string,"created_at": string,"id": string,"idempotency_key": string | null,"kind": string,"payment_method_id": string | null,"received_by": string,"sale_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"business_id": string,"client_created_at"?: string,"created_at"?: string,"id"?: string,"idempotency_key"?: string | null,"kind": string,"payment_method_id"?: string | null,"received_by": string,"sale_id": string
                  }
                  Update: {
                    "amount"?: number,"business_id"?: string,"client_created_at"?: string,"created_at"?: string,"id"?: string,"idempotency_key"?: string | null,"kind"?: string,"payment_method_id"?: string | null,"received_by"?: string,"sale_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_payment_method_id_fkey"
      columns: ["payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"permissions": {
                  Row: {
                    "code": string,"description": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description": string
                  }
                  Update: {
                    "code"?: string,"description"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_costs": {
                  Row: {
                    "product_id": string,"unit_cost": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "product_id": string,"unit_cost": number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "product_id"?: string,"unit_cost"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_costs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_costs_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"business_id": string,"category_id": string,"code": string,"created_at": string,"id": string,"min_stock": number,"name": string,"price": number,"stock": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"business_id": string,"category_id": string,"code": string,"created_at"?: string,"id"?: string,"min_stock"?: number,"name": string,"price": number,"stock"?: number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"category_id"?: string,"code"?: string,"created_at"?: string,"id"?: string,"min_stock"?: number,"name"?: string,"price"?: number,"stock"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"business_id": string,"created_at": string,"full_name": string,"id": string,"phone_e164": string | null,"role_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"business_id": string,"created_at"?: string,"full_name": string,"id": string,"phone_e164"?: string | null,"role_id": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"business_id"?: string,"created_at"?: string,"full_name"?: string,"id"?: string,"phone_e164"?: string | null,"role_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"reminders": {
                  Row: {
                    "business_id": string,"channel": string,"created_at": string,"customer_id": string,"id": string,"outbox_id": string | null,"sale_id": string,"sent_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"channel": string,"created_at"?: string,"customer_id": string,"id"?: string,"outbox_id"?: string | null,"sale_id": string,"sent_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "business_id"?: string,"channel"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"outbox_id"?: string | null,"sale_id"?: string,"sent_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "v_customer_balances"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "reminders_outbox_id_fkey"
      columns: ["outbox_id"]
isOneToOne: false
      referencedRelation: "notification_outbox"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reminders_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    },{
      foreignKeyName: "reminders_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"role_permissions": {
                  Row: {
                    "permission_code": string,"role_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "permission_code": string,"role_id": string
                  }
                  Update: {
                    "permission_code"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_code_fkey"
      columns: ["permission_code"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "role_permissions_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "business_id": string,"code": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"code": string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "business_id"?: string,"code"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roles_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_item_costs": {
                  Row: {
                    "sale_item_id": string,"unit_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "sale_item_id": string,"unit_cost": number
                  }
                  Update: {
                    "sale_item_id"?: string,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_item_costs_sale_item_id_fkey"
      columns: ["sale_item_id"]
isOneToOne: true
      referencedRelation: "sale_items"
      referencedColumns: ["id"]
    }
                  ]
                },"sale_items": {
                  Row: {
                    "created_at": string,"id": string,"product_id": string,"product_name": string,"qty": number,"sale_id": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"product_id": string,"product_name": string,"qty": number,"sale_id": string,"unit_price": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"product_id"?: string,"product_name"?: string,"qty"?: number,"sale_id"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    }
                  ]
                },"sales": {
                  Row: {
                    "business_id": string,"client_created_at": string,"created_at": string,"customer_id": string,"description": string | null,"down_payment": number,"folio": number,"id": string,"idempotency_key": string,"months": number | null,"payment_method_id": string | null,"seller_id": string,"source": string,"total": number,"type": string,"void_reason": string | null,"voided_at": string | null,"voided_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"client_created_at"?: string,"created_at"?: string,"customer_id": string,"description"?: string | null,"down_payment"?: number,"folio": number,"id"?: string,"idempotency_key": string,"months"?: number | null,"payment_method_id"?: string | null,"seller_id": string,"source"?: string,"total": number,"type": string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"client_created_at"?: string,"created_at"?: string,"customer_id"?: string,"description"?: string | null,"down_payment"?: number,"folio"?: number,"id"?: string,"idempotency_key"?: string,"months"?: number | null,"payment_method_id"?: string | null,"seller_id"?: string,"source"?: string,"total"?: number,"type"?: string,"void_reason"?: string | null,"voided_at"?: string | null,"voided_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "v_customer_balances"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "sales_payment_method_id_fkey"
      columns: ["payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_voided_by_fkey"
      columns: ["voided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_customer_balances": {
                  Row: {
                    "balance": number | null,"business_id": string,"customer_id": string,"open_sales": number | null,"overdue_amount": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "customers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"v_installment_status": {
                  Row: {
                    "amount": number,"business_id": string,"cum_due": number | null,"due_date": string,"id": string,"number": number,"paid_total": number | null,"sale_id": string,"status": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "installments_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "v_sale_accounts"
      referencedColumns: ["sale_id"]
    },{
      foreignKeyName: "sales_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"v_sale_accounts": {
                  Row: {
                    "balance": number | null,"business_id": string,"client_created_at": string,"customer_id": string,"folio": number,"next_due_amount": number | null,"next_due_date": string | null,"overdue_amount": number | null,"paid": number | null,"progress_pct": number | null,"sale_id": string,"source": string,"status": string | null,"total": number,"type": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "sales_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "v_customer_balances"
      referencedColumns: ["customer_id"]
    }
                  ]
                }
          }
          Functions: {
            "create_customer":
{ Args: { "p_email"?: string,"p_id"?: string,"p_name": string,"p_notes"?: string,"p_phone": string,"p_whatsapp_opt_in"?: boolean,"p_zone"?: string }; Returns: Json
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"ping":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"register_legacy_balance":
{ Args: { "p_customer_id": string,"p_description": string,"p_first_due_date": string,"p_id"?: string,"p_idempotency_key": string,"p_installments": number,"p_paid": number,"p_sale_date": string,"p_total": number }; Returns: Json
                           },
"register_payment":
{ Args: { "p_amount": number,"p_client_created_at"?: string,"p_confirm_duplicate"?: boolean,"p_id"?: string,"p_idempotency_key": string,"p_payment_method_id": string,"p_sale_id": string }; Returns: Json
                           },
"register_sale":
{ Args: { "p_client_created_at"?: string,"p_confirm_duplicate"?: boolean,"p_customer_id": string,"p_down_payment"?: number,"p_expected_total": number,"p_id"?: string,"p_idempotency_key": string,"p_items": Json,"p_months"?: number,"p_payment_method_id": string,"p_type": string }; Returns: Json
                           },
"search_customers":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: Json
                           },
"update_customer":
{ Args: { "p_email"?: string,"p_id": string,"p_name": string,"p_notes"?: string,"p_phone": string,"p_whatsapp_opt_in"?: boolean,"p_zone"?: string }; Returns: Json
                           },
"void_sale":
{ Args: { "p_reason": string,"p_sale_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
