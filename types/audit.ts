export interface User {
  id: number;
  username?: string;
  email: string;
}

export interface AuditLogData {
  user?: number | null;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id: number;
  entity_document_id: string;
  changes: Record<string, any>;
  previous_values: Record<string, any>;
  timestamp: Date;
}

export interface Product {
  id: number;
  documentId: string;
  name: string;
  category: "proprietary" | "classical";
  description: string;
  proprietary_fields?: {
    usage?: string;
    ingredients?: string;
    dosage?: string;
    price_list?: Array<{
      id?: number;
      sr_no: number | string;
      qty: string;
      price: string;
    }>;
  };
  classical_fields?: {
    sub_category?: string;
    usage?: string;
    ingredients?: string;
    dosage_anupan?: string;
    reference?: string;
    price_list?: Array<{
      id?: number;
      sr_no: number | string;
      qty: string;
      price: string;
    }>;
  };
  [key: string]: any;
}

export interface LifecycleEvent {
  result: Product;
  params: {
    where?: { id: number };
    data?: Partial<Product>;
    existingData?: Product;
    [key: string]: any;
  };
}
