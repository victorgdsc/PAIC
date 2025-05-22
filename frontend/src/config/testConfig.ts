export interface ExampleFile {
  id: string;
  name: string;
  path: string;
  description: string | string[];
  numericColumns?: readonly string[];
  columnMapping?: { [columnName: string]: "estimatedDate" | "actualDate" | "factor" | "delay" };
}

export const TEST_CONFIG = {
  AUTO_UPLOAD_ENABLED: true,
  AUTO_MAP_FIXED_FACTORS: true,
  EXAMPLE_FILES: [
    {
      id: 'delivery-history',
      name: 'PEPFAR SCMS Global Delivery Dataset',
      path: 'https://drive.google.com/uc?export=download&id=1Q__rEJeiTzWBDusTWD7dIVuD_YORviao',
      description: ['Histórico de entregas de kits de testes rápidos e medicamentos antirretrovirais em países atendidos pelo PEPFAR entre 2006 e 2015. Os dados representam os embarques realizados pelo SCMS, com informações como país, peso e modo de envio.', 'O arquivo possui 10.322 registros, permitindo análises relevantes com bom desempenho de carregamento.'],
      numericColumns: [
        'Weight (Kilograms)'
      ],
      columnMapping: {
        'Scheduled Delivery Date': 'estimatedDate',
        'Delivered to Client Date': 'actualDate',
        'Country': 'factor',
        'Shipment Mode': 'factor',
        'Product Group': 'factor',
        'Weight (Kilograms)' : 'factor'
      }
    },
    {
      id: 'olist',
      name: 'Olist E-Commerce Dataset',
      path: 'https://drive.google.com/uc?export=download&id=1ZZ9fbH9uLmzAzHsZMSU3n8eFt27Edc7q',
      description: ['Pedidos realizados na Olist entre 2016 e 2018, com dados sobre entregas, clientes, produtos e pagamentos.',
'O arquivo possui 120.105 registros, o que melhora a confiabilidade das previsões. Por ser grande, pode demorar mais para carregar e deixar a navegação mais lenta.'],
      numericColumns: [
          'price','freight_value','product_weight_g','product_length_cm','payment_installments','payment_value'
        ],
        columnMapping: {
          'order_delivered_customer_date': 'actualDate',
          'order_estimated_delivery_date': 'estimatedDate',
          'order_status': 'factor',
          'customer_city': 'factor',
          'customer_state': 'factor',
          'seller_city': 'factor',
          'seller_state': 'factor',
          'price': 'factor',
          'freight_value': 'factor',
          'product_category_name_english': 'factor',
          'product_weight_g': 'factor',
          'product_length_cm': 'factor',
          'payment_value': 'factor'
        }
      },
      {
        id: 'DataCo Supply Chain Dataset',
        name: 'DataCo Supply Chain Dataset',
        path: 'https://drive.google.com/uc?export=download&id=1tXV5w-dpooip7I3b-Vws5fGhSqOXcUAT',
        description: ['Simulação de operações logísticas entre 2015 e 2018, com dados sobre pedidos, envios, clientes e categorias de produtos.',
          'O arquivo possui 180.519 registros, o que melhora a confiabilidade das previsões. Por ser grande, pode demorar mais para carregar e deixar a navegação mais lenta.'],
        numericColumns: [
          'Benefit per order','Sales','Order Item Product Price','Order Item Profit Ratio','Order Item Quantity','Order Item Total','Order Profit Per Order','Product Price'
        ],
        columnMapping: {
          'Days for shipping (real)': 'actualDate',
          'Days for shipping (scheduled)': 'estimatedDate',
          'Benefit per order': 'factor',
          'Category Name': 'factor',
          'Customer City': 'factor',
          'Customer Country': 'factor',
          'Customer Segment': 'factor',
          'Customer State': 'factor',
          'Customer Zipcode': 'factor',
          'Department Name': 'factor',
          'Market': 'factor',
          'Order City': 'factor',
          'Order Country': 'factor',
          'Order Item Product Price': 'factor',
          'Order Item Profit Ratio': 'factor',
          'Order Item Quantity': 'factor',
          'Sales': 'factor',
          'Order Item Total': 'factor',
          'Order Profit Per Order': 'factor',
          'Order Region': 'factor',
          'Order State': 'factor',
          'Order Zipcode': 'factor',
          'Product Price': 'factor',
          'Shipping Mode': 'factor'
        }
      },
    {
      id: 'loan-payments',
      name: 'Pagamentos de Empréstimos',
      path: 'https://drive.google.com/uc?export=download&id=1pyhGpg1tql5GOGIhatGF7awhQhMRj9Zc',
      description: ['Pagamentos de empréstimos registrados entre setembro e novembro de 2016, com informações sobre valor, prazo e perfil do cliente.',
        'O arquivo possui 500 registros, ideal para testes rápidos e com carregamento leve, mas com menor confiabilidade estatística.'],
      numericColumns: ['Principal', 'terms', 'past_due_days', 'age'],
      columnMapping: {
        'due_date': 'estimatedDate',
        'paid_off_time': 'actualDate',
        'education': 'factor',
        'Gender': 'factor',
        'Principal': 'factor',
        'terms': 'factor',
        'age': 'factor'
      }
    }

    ] as const,
    get DEFAULT_FILE() {
      return this.EXAMPLE_FILES[0];
    }
  } as const;
