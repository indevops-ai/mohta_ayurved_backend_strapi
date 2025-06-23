import type { Schema, Struct } from '@strapi/strapi';

export interface ClassicalFieldsClassicalFields extends Struct.ComponentSchema {
  collectionName: 'components_classical_fields_classical_fields';
  info: {
    displayName: 'classical_fields';
  };
  attributes: {
    dosage_anupan: Schema.Attribute.Text;
    ingredients: Schema.Attribute.Text;
    price_list: Schema.Attribute.Component<'price-entry.price-entry', true>;
    reference: Schema.Attribute.Text;
    sub_category: Schema.Attribute.String;
    usage: Schema.Attribute.Text;
  };
}

export interface PriceEntryPriceEntry extends Struct.ComponentSchema {
  collectionName: 'components_price_entry_price_entries';
  info: {
    displayName: 'price_entry';
  };
  attributes: {
    price: Schema.Attribute.String;
    qty: Schema.Attribute.String;
    sr_no: Schema.Attribute.Integer;
  };
}

export interface ProprietaryFieldsProprietaryFields
  extends Struct.ComponentSchema {
  collectionName: 'components_proprietary_fields_proprietary_fields';
  info: {
    displayName: 'proprietary_fields';
  };
  attributes: {
    dosage: Schema.Attribute.Text;
    ingredients: Schema.Attribute.Text;
    price_list: Schema.Attribute.Component<'price-entry.price-entry', true>;
    usage: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'classical-fields.classical-fields': ClassicalFieldsClassicalFields;
      'price-entry.price-entry': PriceEntryPriceEntry;
      'proprietary-fields.proprietary-fields': ProprietaryFieldsProprietaryFields;
    }
  }
}
