import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Reports from './Reports';

// Mock the recharts library
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />
}));

// Mock the analytics hook
jest.mock('../../hooks/usePaymentAnalytics', () => ({
  usePaymentAnalytics: () => ({
    analytics: null,
    monthlyData: [],
    verificationData: [],
    isLoading: false,
    error: null
  })
}));

// Mock Firebase config
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {}
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Reports Page', () => {
  test('renders reports page with title and subtitle', () => {
    renderWithRouter(<Reports />);
    
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive insights into project performance and financial trends')).toBeInTheDocument();
  });

  test('renders filter section with all filter options', () => {
    renderWithRouter(<Reports />);
    
    expect(screen.getByText('Report Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Payment Status')).toBeInTheDocument();
  });

  test('renders export section with all export options', () => {
    renderWithRouter(<Reports />);
    
    expect(screen.getByText('Export & Print')).toBeInTheDocument();
    expect(screen.getByText('📄 Export PDF')).toBeInTheDocument();
    expect(screen.getByText('📊 Export CSV')).toBeInTheDocument();
    expect(screen.getByText('🖨️ Print Report')).toBeInTheDocument();
  });

  test('allows changing filter values', () => {
    renderWithRouter(<Reports />);
    
    const startDateInput = screen.getByLabelText('Start Date');
    const projectSelect = screen.getByLabelText('Project');
    const statusSelect = screen.getByLabelText('Payment Status');
    
    // Change filter values
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(projectSelect, { target: { value: 'all' } });
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    
    expect(startDateInput.value).toBe('2024-01-01');
    expect(projectSelect.value).toBe('all');
    expect(statusSelect.value).toBe('completed');
  });
});