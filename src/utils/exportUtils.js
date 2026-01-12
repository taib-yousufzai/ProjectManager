// Export utilities for reports and data

/**
 * Helper to safely format dates handling Firestore Timestamps
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString();
  }
  // Handle standard Date object or string
  return new Date(date).toLocaleDateString();
};

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {string} filename - Name of the file to download
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Generate PDF report (simplified version - in production would use a proper PDF library)
 * @param {Object} reportData - Data to include in the PDF
 * @param {string} filename - Name of the PDF file
 */
export const exportToPDF = (reportData, filename = 'report.pdf') => {
  // This is a simplified implementation
  // In a real application, you would use libraries like jsPDF, Puppeteer, or server-side PDF generation

  const printWindow = window.open('', '_blank');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportData.title || 'Report'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #4A6CF7;
          padding-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #4A6CF7;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 14px;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #4A6CF7;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${reportData.title || 'Project & Payments Report'}</div>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        ${reportData.dateRange ? `<div class="subtitle">Period: ${reportData.dateRange}</div>` : ''}
      </div>

      ${reportData.summary ? `
        <div class="section">
          <div class="section-title">Summary Statistics</div>
          <div class="stats-grid">
            ${Object.entries(reportData.summary).map(([key, value]) => `
              <div class="stat-card">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${reportData.projects && reportData.projects.length > 0 ? `
        <div class="section">
          <div class="section-title">Projects</div>
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Total Paid</th>
                <th>Client</th>
                <th>Start Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.projects.map(project => `
                <tr>
                  <td>${project.name}</td>
                  <td>${project.status}</td>
                  <td>${project.budget}</td>
                  <td>${project.totalPaid}</td>
                  <td>${project.clientName}</td>
                  <td>${formatDate(project.startDate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${reportData.payments && reportData.payments.length > 0 ? `
        <div class="section">
          <div class="section-title">Payments</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.payments.map(payment => `
                <tr>
                  <td>${formatDate(payment.paymentDate)}</td>
                  <td>${payment.amount}</td>
                  <td>${payment.status}</td>
                  <td>${payment.description}</td>
                  <td>${payment.paymentMethod}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <p>This report was generated by the Project & Payments Tracking System</p>
        <p>For questions or support, please contact your system administrator</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Note: In a real implementation, you might want to keep the window open
      // or provide a way for users to close it manually
    }, 500);
  };
};

/**
 * Prepare project data for CSV export
 * @param {Array} projects - Array of project objects
 * @returns {Array} Formatted data for CSV export
 */
export const prepareProjectsForCSV = (projects) => {
  return projects.map(project => ({
    'Project Name': project.name,
    'Description': project.description,
    'Status': project.status,
    'Start Date': formatDate(project.startDate),
    'End Date': formatDate(project.endDate),
    'Budget': project.budget,
    'Total Paid': project.totalPaid,
    'Client Name': project.clientName,
    'Team Members': project.teamMembers ? project.teamMembers.join('; ') : '',
    'Tags': project.tags ? project.tags.join('; ') : '',
    'Created At': formatDate(project.createdAt),
    'Updated At': formatDate(project.updatedAt)
  }));
};

/**
 * Prepare payment data for CSV export
 * @param {Array} payments - Array of payment objects
 * @returns {Array} Formatted data for CSV export
 */
export const preparePaymentsForCSV = (payments) => {
  return payments.map(payment => ({
    'Payment Date': formatDate(payment.paymentDate),
    'Amount': payment.amount,
    'Currency': payment.currency,
    'Status': payment.status,
    'Description': payment.description,
    'Payment Method': payment.paymentMethod,
    'Transaction ID': payment.transactionId || 'N/A',
    'Created At': formatDate(payment.createdAt)
  }));
};

/**
 * Prepare revenue data for CSV export
 * @param {Array} revenueData - Array of revenue entries
 * @returns {Array} Formatted data for CSV export
 */
export const prepareRevenueDataForCSV = (revenueData) => {
  return revenueData.map(entry => ({
    'Date': formatDate(entry.date),
    'Project': entry.projectName || 'N/A',
    'Payment ID': entry.paymentId || 'N/A',
    'Revenue Rule': entry.revenueRuleName || 'N/A',
    'Party': entry.party ? entry.party.charAt(0).toUpperCase() + entry.party.slice(1) : 'N/A',
    'Amount': entry.amount,
    'Currency': entry.currency,
    'Status': entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : 'N/A',
    'Type': entry.type ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : 'N/A'
  }));
};

/**
 * Prepare ledger entries for CSV export
 * @param {Array} ledgerEntries - Array of ledger entry objects
 * @returns {Array} Formatted data for CSV export
 */
export const prepareLedgerEntriesForCSV = (ledgerEntries) => {
  return ledgerEntries.map(entry => ({
    'Entry ID': entry.id,
    'Date': formatDate(entry.date),
    'Party': entry.party.charAt(0).toUpperCase() + entry.party.slice(1),
    'Type': entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
    'Amount': entry.amount,
    'Currency': entry.currency,
    'Status': entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
    'Project ID': entry.projectId || 'N/A',
    'Payment ID': entry.paymentId || 'N/A',
    'Revenue Rule ID': entry.revenueRuleId || 'N/A',
    'Settlement ID': entry.settlementId || 'N/A',
    'Remarks': entry.remarks || '',
    'Created At': formatDate(entry.createdAt),
    'Updated At': formatDate(entry.updatedAt)
  }));
};

/**
 * Prepare settlements for CSV export
 * @param {Array} settlements - Array of settlement objects
 * @returns {Array} Formatted data for CSV export
 */
export const prepareSettlementsForCSV = (settlements) => {
  return settlements.map(settlement => ({
    'Settlement ID': settlement.id,
    'Party': settlement.party.charAt(0).toUpperCase() + settlement.party.slice(1),
    'Total Amount': settlement.totalAmount,
    'Currency': settlement.currency,
    'Settlement Date': formatDate(settlement.settlementDate),
    'Entry Count': settlement.ledgerEntryIds.length,
    'Ledger Entry IDs': settlement.ledgerEntryIds.join('; '),
    'Proof URLs': settlement.proofUrls ? settlement.proofUrls.join('; ') : 'N/A',
    'Remarks': settlement.remarks || '',
    'Created By': settlement.createdBy,
    'Created At': formatDate(settlement.createdAt)
  }));
};

/**
 * Prepare party balances for CSV export
 * @param {Array} balances - Array of party balance objects
 * @returns {Array} Formatted data for CSV export
 */
export const preparePartyBalancesForCSV = (balances) => {
  return balances.map(balance => ({
    'Party': balance.party.charAt(0).toUpperCase() + balance.party.slice(1),
    'Total Pending': balance.totalPending,
    'Total Cleared': balance.totalCleared,
    'Net Balance': balance.netBalance,
    'Currency': balance.currency,
    'Last Updated': formatDate(balance.lastUpdated)
  }));
};

/**
 * Generate a comprehensive ledger report object for PDF export
 * @param {Object} data - All ledger report data
 * @param {Object} filters - Applied filters
 * @returns {Object} Report object ready for PDF generation
 */
export const generateLedgerReportData = (data, filters = {}) => {
  const { ledgerEntries, settlements, balances, summaryStats, dateRange } = data;

  return {
    title: 'Ledger & Settlement Report',
    dateRange: dateRange ? `${dateRange.startDate} to ${dateRange.endDate}` : null,
    filters: {
      party: filters.party || 'All Parties',
      status: filters.status || 'All Statuses',
      currency: filters.currency || 'All Currencies',
      projectId: filters.projectId || 'All Projects'
    },
    summary: {
      'Total Entries': summaryStats.totalEntries || 0,
      'Pending Entries': summaryStats.pendingEntries || 0,
      'Cleared Entries': summaryStats.clearedEntries || 0,
      'Total Settlements': summaryStats.totalSettlements || 0,
      'Total Pending Amount': summaryStats.totalPendingAmount ? `$${summaryStats.totalPendingAmount.toLocaleString()}` : '$0',
      'Total Cleared Amount': summaryStats.totalClearedAmount ? `$${summaryStats.totalClearedAmount.toLocaleString()}` : '$0'
    },
    ledgerEntries: ledgerEntries?.slice(0, 100).map(entry => ({
      date: formatDate(entry.date),
      party: entry.party.charAt(0).toUpperCase() + entry.party.slice(1),
      type: entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
      amount: `$${entry.amount.toLocaleString()}`,
      currency: entry.currency,
      status: entry.status.charAt(0).toUpperCase() + entry.status.slice(1),
      remarks: entry.remarks || 'N/A'
    })),
    settlements: settlements?.slice(0, 50).map(settlement => ({
      date: formatDate(settlement.settlementDate),
      party: settlement.party.charAt(0).toUpperCase() + settlement.party.slice(1),
      amount: `$${settlement.totalAmount.toLocaleString()}`,
      currency: settlement.currency,
      entryCount: settlement.ledgerEntryIds.length,
      remarks: settlement.remarks || 'N/A'
    })),
    balances: balances?.map(balance => ({
      party: balance.party.charAt(0).toUpperCase() + balance.party.slice(1),
      pending: `$${balance.totalPending.toLocaleString()}`,
      cleared: `$${balance.totalCleared.toLocaleString()}`,
      net: `$${balance.netBalance.toLocaleString()}`,
      currency: balance.currency
    }))
  };
};

/**
 * Export ledger data with multiple format options
 * @param {Object} data - Ledger data to export
 * @param {string} format - Export format ('CSV' or 'PDF')
 * @param {string} type - Data type ('entries', 'settlements', 'balances', 'comprehensive')
 * @param {Object} filters - Applied filters for context
 */
export const exportLedgerData = (data, format, type = 'comprehensive', filters = {}) => {
  try {
    const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');

    if (format === 'PDF') {
      let reportData;

      switch (type) {
        case 'entries':
          reportData = {
            title: 'Ledger Entries Report',
            dateRange: filters.dateRange ? `${filters.dateRange.start.toLocaleDateString()} to ${filters.dateRange.end.toLocaleDateString()}` : null,
            filters,
            summary: {
              'Total Entries': data.ledgerEntries?.length || 0,
              'Filtered Results': data.ledgerEntries?.length || 0
            },
            ledgerEntries: data.ledgerEntries
          };
          break;

        case 'settlements':
          reportData = {
            title: 'Settlements Report',
            dateRange: filters.dateRange ? `${filters.dateRange.start.toLocaleDateString()} to ${filters.dateRange.end.toLocaleDateString()}` : null,
            filters,
            summary: {
              'Total Settlements': data.settlements?.length || 0,
              'Total Amount': data.settlements ? `$${data.settlements.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}` : '$0'
            },
            settlements: data.settlements
          };
          break;

        case 'balances':
          reportData = {
            title: 'Party Balances Report',
            dateRange: `As of ${new Date().toLocaleDateString()}`,
            filters,
            summary: {
              'Parties': data.balances?.length || 0,
              'Total Pending': data.balances ? `$${data.balances.reduce((sum, b) => sum + b.totalPending, 0).toLocaleString()}` : '$0',
              'Total Cleared': data.balances ? `$${data.balances.reduce((sum, b) => sum + b.totalCleared, 0).toLocaleString()}` : '$0'
            },
            balances: data.balances
          };
          break;

        default:
          reportData = generateLedgerReportData(data, filters);
      }

      exportToPDF(reportData, `ledger-${type}-report-${currentDate}.pdf`);

    } else if (format === 'CSV') {
      switch (type) {
        case 'entries':
          if (data.ledgerEntries && data.ledgerEntries.length > 0) {
            const entriesCSV = prepareLedgerEntriesForCSV(data.ledgerEntries);
            exportToCSV(entriesCSV, `ledger-entries-${currentDate}.csv`);
          } else {
            throw new Error('No ledger entries to export');
          }
          break;

        case 'settlements':
          if (data.settlements && data.settlements.length > 0) {
            const settlementsCSV = prepareSettlementsForCSV(data.settlements);
            exportToCSV(settlementsCSV, `settlements-${currentDate}.csv`);
          } else {
            throw new Error('No settlements to export');
          }
          break;

        case 'balances':
          if (data.balances && data.balances.length > 0) {
            const balancesCSV = preparePartyBalancesForCSV(data.balances);
            exportToCSV(balancesCSV, `party-balances-${currentDate}.csv`);
          } else {
            throw new Error('No balance data to export');
          }
          break;

        default:
          // Comprehensive export - let user choose what to export
          const exportChoice = window.prompt(
            'What would you like to export?\n' +
            '1. Ledger Entries\n' +
            '2. Settlements\n' +
            '3. Party Balances\n' +
            'Enter 1, 2, or 3:'
          );

          switch (exportChoice) {
            case '1':
              if (data.ledgerEntries && data.ledgerEntries.length > 0) {
                const entriesCSV = prepareLedgerEntriesForCSV(data.ledgerEntries);
                exportToCSV(entriesCSV, `ledger-entries-${currentDate}.csv`);
              } else {
                throw new Error('No ledger entries to export');
              }
              break;
            case '2':
              if (data.settlements && data.settlements.length > 0) {
                const settlementsCSV = prepareSettlementsForCSV(data.settlements);
                exportToCSV(settlementsCSV, `settlements-${currentDate}.csv`);
              } else {
                throw new Error('No settlements to export');
              }
              break;
            case '3':
              if (data.balances && data.balances.length > 0) {
                const balancesCSV = preparePartyBalancesForCSV(data.balances);
                exportToCSV(balancesCSV, `party-balances-${currentDate}.csv`);
              } else {
                throw new Error('No balance data to export');
              }
              break;
            default:
              if (exportChoice !== null) {
                throw new Error('Invalid choice. Please select 1, 2, or 3.');
              }
              return;
          }
      }
    }
  } catch (error) {
    console.error('Ledger export error:', error);
    throw error;
  }
};

/**
 * Print the current page with print-friendly styling
 */
export const printCurrentPage = () => {
  window.print();
};

/**
 * Generate a comprehensive report object for PDF export
 * @param {Object} data - All report data
 * @param {Object} filters - Applied filters
 * @returns {Object} Report object ready for PDF generation
 */
export const generateReportData = (data, filters = {}) => {
  const { projects, payments, summaryStats, dateRange } = data;

  return {
    title: 'Project & Payments Report',
    dateRange: dateRange ? `${dateRange.startDate} to ${dateRange.endDate}` : null,
    summary: {
      'Total Revenue': summaryStats.totalRevenue ? `$${summaryStats.totalRevenue.toLocaleString()}` : '$0',
      'Total Projects': summaryStats.totalProjects || 0,
      'Completed Projects': summaryStats.completedProjects || 0,
      'Active Projects': summaryStats.activeProjects || 0,
      'Completion Rate': `${summaryStats.completionRate || 0}%`,
      'Average Project Value': summaryStats.avgProjectValue ? `$${summaryStats.avgProjectValue.toLocaleString()}` : '$0'
    },
    projects: projects?.map(project => ({
      ...project,
      budget: `$${project.budget.toLocaleString()}`,
      totalPaid: `$${project.totalPaid.toLocaleString()}`,
      startDate: formatDate(project.startDate), // Safe formatting
      created: formatDate(project.createdAt) // Safe formatting
    })),
    payments: payments?.map(payment => ({
      ...payment,
      amount: `$${payment.amount.toLocaleString()}`,
      date: formatDate(payment.paymentDate) // Safe formatting
    }))
  };
};