import { AnalyticsMetrics, DateRange, ExportOptions } from '../types/admin';

export class DataExportService {
  /**
   * Export analytics data to CSV format
   */
  static exportToCSV(data: AnalyticsMetrics, options: ExportOptions): void {
    const { dateRange, metrics } = options;
    const csvContent = this.generateCSVContent(data, dateRange, metrics);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', this.generateFileName(dateRange, 'csv'));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Generate CSV content from analytics data
   */
  private static generateCSVContent(
    data: AnalyticsMetrics,
    dateRange: DateRange,
    selectedMetrics: string[]
  ): string {
    let csvContent = `Analytics Report - ${dateRange.startDate} to ${dateRange.endDate}\n\n`;

    // User Metrics
    if (selectedMetrics.includes('users')) {
      csvContent += 'USER METRICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Users,${data.userMetrics.totalUsers}\n`;
      csvContent += `New Users,${data.userMetrics.newUsers}\n`;
      csvContent += `Active Users,${data.userMetrics.activeUsers}\n\n`;

      csvContent += 'User Registrations by Date\n';
      csvContent += 'Date,Registrations\n';
      data.userMetrics.registrationsByDate.forEach(item => {
        csvContent += `${item.date},${item.value}\n`;
      });
      csvContent += '\n';

      csvContent += 'Users by Region\n';
      csvContent += 'Region,Count,Percentage\n';
      data.userMetrics.usersByRegion.forEach(item => {
        csvContent += `${item.region},${item.count},${item.percentage}%\n`;
      });
      csvContent += '\n';
    }

    // Listing Metrics
    if (selectedMetrics.includes('listings')) {
      csvContent += 'LISTING METRICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Listings,${data.listingMetrics.totalListings}\n`;
      csvContent += `New Listings,${data.listingMetrics.newListings}\n`;
      csvContent += `Active Listings,${data.listingMetrics.activeListings}\n`;
      csvContent += `Average Listing Price,$${data.listingMetrics.averageListingPrice}\n\n`;

      csvContent += 'Listings by Date\n';
      csvContent += 'Date,New Listings\n';
      data.listingMetrics.listingsByDate.forEach(item => {
        csvContent += `${item.date},${item.value}\n`;
      });
      csvContent += '\n';

      csvContent += 'Listings by Category\n';
      csvContent += 'Category,Count,Percentage\n';
      data.listingMetrics.listingsByCategory.forEach(item => {
        csvContent += `${item.category},${item.count},${item.percentage}%\n`;
      });
      csvContent += '\n';
    }

    // Engagement Metrics
    if (selectedMetrics.includes('engagement')) {
      csvContent += 'ENGAGEMENT METRICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Searches,${data.engagementMetrics.totalSearches}\n`;
      csvContent += `Unique Searchers,${data.engagementMetrics.uniqueSearchers}\n`;
      csvContent += `Average Searches per User,${data.engagementMetrics.averageSearchesPerUser}\n`;
      csvContent += `Listing Views,${data.engagementMetrics.listingViews}\n`;
      csvContent += `Average Views per Listing,${data.engagementMetrics.averageViewsPerListing}\n`;
      csvContent += `Inquiries,${data.engagementMetrics.inquiries}\n`;
      csvContent += `Inquiry Rate,${data.engagementMetrics.inquiryRate}%\n\n`;

      csvContent += 'Top Search Terms\n';
      csvContent += 'Term,Count,Trend\n';
      data.engagementMetrics.topSearchTerms.forEach(item => {
        csvContent += `${item.term},${item.count},${item.trend}\n`;
      });
      csvContent += '\n';
    }

    // Geographic Metrics
    if (selectedMetrics.includes('geographic')) {
      csvContent += 'GEOGRAPHIC METRICS\n';
      csvContent += 'Users by State\n';
      csvContent += 'State,Count,Percentage\n';
      data.geographicMetrics.usersByState.forEach(item => {
        csvContent += `${item.state},${item.count},${item.percentage}%\n`;
      });
      csvContent += '\n';

      csvContent += 'Listings by State\n';
      csvContent += 'State,Count,Percentage\n';
      data.geographicMetrics.listingsByState.forEach(item => {
        csvContent += `${item.state},${item.count},${item.percentage}%\n`;
      });
      csvContent += '\n';

      csvContent += 'Top Cities\n';
      csvContent += 'City,State,Count,Percentage\n';
      data.geographicMetrics.topCities.forEach(item => {
        csvContent += `${item.city},${item.state},${item.count},${item.percentage}%\n`;
      });
      csvContent += '\n';
    }

    return csvContent;
  }

  /**
   * Generate filename for export
   */
  private static generateFileName(dateRange: DateRange, format: string): string {
    const startDate = dateRange.startDate.replace(/-/g, '');
    const endDate = dateRange.endDate.replace(/-/g, '');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
    
    return `analytics_report_${startDate}_${endDate}_${timestamp}.${format}`;
  }

  /**
   * Export chart data to CSV
   */
  static exportChartDataToCSV(
    chartData: any,
    title: string,
    dateRange: DateRange
  ): void {
    let csvContent = `${title} - ${dateRange.startDate} to ${dateRange.endDate}\n\n`;
    
    // Add headers
    const headers = ['Label', ...chartData.datasets.map((dataset: any) => dataset.label)];
    csvContent += headers.join(',') + '\n';
    
    // Add data rows
    chartData.labels.forEach((label: string, index: number) => {
      const row = [label];
      chartData.datasets.forEach((dataset: any) => {
        row.push(dataset.data[index] || 0);
      });
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}