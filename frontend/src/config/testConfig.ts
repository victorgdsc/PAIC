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
      path: 'samples/PEPFAR_SCMS_Global_Delivery_Dataset.csv',
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
      path: 'samples/Olist_E-Commerce_Dataset.csv',
      description: ['Pedidos realizados na Olist entre 2016 e 2018, com dados sobre entregas, clientes, produtos e pagamentos.',
'O arquivo possui 120.105 registros, o que melhora a confiabilidade das previsões. Por ser grande, pode demorar mais para carregar e deixar a navegação mais lenta.'],
      numericColumns: [
          'price','freight_value','product_weight_g','payment_value'
        ],
        columnMapping: {
          'order_delivered_customer_date': 'actualDate',
          'order_estimated_delivery_date': 'estimatedDate',
          'customer_city': 'factor',
          'seller_city': 'factor',
          'price': 'factor',
          'freight_value': 'factor',
          'product_weight_g': 'factor',
          'payment_value': 'factor'
        }
      },
      {
        id: 'DataCo Supply Chain Dataset',
        name: 'DataCo Supply Chain Dataset',
        path: 'samples/DataCo_Supply_Chain_Dataset.csv',
        description: ['Simulação de operações logísticas entre 2015 e 2018, com dados sobre pedidos, envios, clientes e categorias de produtos.',
          'O arquivo possui 180.519 registros, o que melhora a confiabilidade das previsões. Por ser grande, pode demorar mais para carregar e deixar a navegação mais lenta.'],
        numericColumns: [
          'Sales','Product Price'
        ],
        columnMapping: {
          'Days for shipping (real)': 'actualDate',
          'Days for shipment (scheduled)': 'estimatedDate',
          'Category Name': 'factor',
          'Customer City': 'factor',
          'Order City': 'factor',
          'Product Price': 'factor',
          'Shipping Mode': 'factor'
        }
      },
    {
      id: 'loan-payments',
      name: 'Pagamentos de Empréstimos',
      path: 'samples/Loan_Payments.csv',
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
