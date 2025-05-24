import React from 'react';
import { useData } from '@/context/DataContext';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const RADIAN = Math.PI / 180;

const DeliveryStatusBreakdown: React.FC = () => {
  const { analysisResult } = useData();

  if (!analysisResult || !analysisResult.statusCounts) {
    return <div>Dados de status das entregas não disponíveis.</div>;
  }

  const statusData = [
    { name: "Antecipadas", value: analysisResult.statusCounts.antecipadas, color: "#10B981" },
    { name: "No Prazo", value: analysisResult.statusCounts.noPrazo, color: "#F59E0B" },
    { name: "Atrasadas", value: analysisResult.statusCounts.atrasadas, color: "#EF4444" },
  ];

  const total = analysisResult.totalDeliveries;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Status das Entregas</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} entregas`, "Quantidade"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="space-y-3 h-full flex flex-col justify-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#10B981] mr-2"></div>
              <div className="text-sm flex-1">
                <span className="font-medium">Entregas Antecipadas: </span>
                <span>
                  {statusData[0].value} (
                  {((statusData[0].value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B] mr-2"></div>
              <div className="text-sm flex-1">
                <span className="font-medium">Entregas No Prazo: </span>
                <span>
                  {statusData[1].value} (
                  {((statusData[1].value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#EF4444] mr-2"></div>
              <div className="text-sm flex-1">
                <span className="font-medium">Entregas Atrasadas: </span>
                <span>
                  {statusData[2].value} (
                  {((statusData[2].value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3 rounded bg-muted/50 text-sm">
                {statusData[2].value >
                statusData[0].value + statusData[1].value ? (
                  <p className="flex items-start">
                    <XCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      A maioria das entregas está atrasada, indicando um
                      problema crítico com os processos de entrega.
                    </span>
                  </p>
                ) : statusData[2].value > statusData[1].value ? (
                  <p className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Entregas atrasadas superam as entregas no prazo, sugerindo
                      oportunidades significativas de melhoria.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      A maioria das entregas está no prazo ou antecipada,
                      indicando gerenciamento de entregas geralmente eficaz.
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStatusBreakdown;
