import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Bus } from '@phosphor-icons/react';
import { Card as TremorCard, Metric, BarChart } from '@tremor/react';

const chartdata = [
  { name: 'Route A', value: 400 },
  { name: 'Route B', value: 300 },
  { name: 'Route C', value: 300 },
];

export default function DesignSystem() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-3xl font-bold mb-8">Design System</h1>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-primary">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Badges (Brand Colors)</h2>
        <div className="flex flex-wrap gap-4">
          {/* Note: Shadcn Badge might not have success/warning/danger out of the box in v4 unless we added them, 
              but we can use custom tailwind classes for the brand colors we added. */}
          <Badge className="bg-success text-white hover:bg-success/80">Success Badge</Badge>
          <Badge className="bg-warning text-white hover:bg-warning/80">Warning Badge</Badge>
          <Badge className="bg-danger text-white hover:bg-danger/80">Danger Badge</Badge>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Shadcn Card</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Shadcn Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the body text of the shadcn card.</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Phosphor Icon</h2>
        <div className="flex items-center gap-2 text-primary">
          <Bus size={32} />
          <span>Bus Icon (32px)</span>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Tremor Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TremorCard decoration="top" decorationColor="blue">
            <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">Active Buses</p>
            <Metric>12</Metric>
          </TremorCard>
          <TremorCard>
            <h3 className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">Bus Activity</h3>
            <BarChart
              className="mt-4 h-48"
              data={chartdata}
              index="name"
              categories={['value']}
              colors={['blue']}
            />
          </TremorCard>
        </div>
      </section>
    </div>
  );
}
