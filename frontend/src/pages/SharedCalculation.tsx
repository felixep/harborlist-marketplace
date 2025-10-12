import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/layout/PageHeader';
import SharedCalculationViewer from '../components/listing/SharedCalculationViewer';

export default function SharedCalculation() {
  const { shareToken } = useParams<{ shareToken: string }>();

  return (
    <>
      <PageHeader
        title="Shared Finance Calculation"
        subtitle="View and analyze this boat financing scenario"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Finance', href: '/finance' },
          { label: 'Shared Calculation' }
        ]}
      />

      <Layout>
        <div className="max-w-4xl mx-auto">
          <SharedCalculationViewer shareToken={shareToken} />
        </div>
      </Layout>
    </>
  );
}