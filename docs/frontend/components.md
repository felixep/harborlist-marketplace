# 📱 User Interface Components

## 📋 **Overview**

HarborList features a comprehensive component library built with React 18, TypeScript, and Tailwind CSS. The design system emphasizes reusability, accessibility, and responsive design for optimal user experience across all devices.

---

## 🎨 **Component Library**

### **Reusable UI Component Documentation**

#### **Design System Foundation**
```typescript
// Theme configuration
export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a'
    },
    secondary: {
      50: '#f0f9ff',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1'
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      500: '#6b7280',
      600: '#4b5563',
      900: '#111827'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px'
  }
} as const;
```

#### **Base Component Types**
```typescript
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}
```

### **Core Components**

#### **Button Component**
```typescript
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  
  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
```

#### **Input Component**
```typescript
export const Input: React.FC<InputProps> = ({
  type = 'text',
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const inputClasses = cn(
    'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
    'focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    'sm:text-sm',
    error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
    props.disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
    className
  );

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={inputId}
        type={type}
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationCircleIcon className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
```

#### **Card Component**
```typescript
interface CardProps extends BaseComponentProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  shadow = 'md',
  border = true,
  hover = false,
  className,
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadowStyles = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const classes = cn(
    'bg-white rounded-lg',
    paddingStyles[padding],
    shadowStyles[shadow],
    border && 'border border-gray-200',
    hover && 'hover:shadow-lg transition-shadow duration-200',
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
```

---

## 📝 **Form Handling**

### **Validation Patterns & User Input Management**

#### **Form Hook Implementation**
```typescript
interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: ValidationSchema<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface ValidationSchema<T> {
  [K in keyof T]?: ValidationRule[];
}

interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit
}: UseFormOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: keyof T, value: any): string | undefined => {
    const rules = validationSchema?.[name];
    if (!rules) return undefined;

    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (!value || value.toString().trim() === '') {
            return rule.message;
          }
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return rule.message;
          }
          break;
        case 'minLength':
          if (value && value.toString().length < rule.value) {
            return rule.message;
          }
          break;
        case 'maxLength':
          if (value && value.toString().length > rule.value) {
            return rule.message;
          }
          break;
        case 'pattern':
          if (value && !rule.value.test(value)) {
            return rule.message;
          }
          break;
        case 'custom':
          if (value && rule.validator && !rule.validator(value)) {
            return rule.message;
          }
          break;
      }
    }
    return undefined;
  };

  const handleChange = (name: keyof T) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: keyof T) => () => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate all fields
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.keys(values).forEach(key => {
      const error = validateField(key as keyof T, values[key as keyof T]);
      if (error) {
        newErrors[key as keyof T] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    if (!hasErrors) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue: (name: keyof T, value: any) => {
      setValues(prev => ({ ...prev, [name]: value }));
    },
    setFieldError: (name: keyof T, error: string) => {
      setErrors(prev => ({ ...prev, [name]: error }));
    },
    resetForm: () => {
      setValues(initialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }
  };
};
```

#### **Form Components**
```typescript
// Listing Creation Form Example
interface ListingFormData {
  title: string;
  description: string;
  price: number;
  boatType: string;
  year: number;
  location: {
    state: string;
    city: string;
  };
}

const CreateListingForm: React.FC = () => {
  const navigate = useNavigate();
  
  const validationSchema: ValidationSchema<ListingFormData> = {
    title: [
      { type: 'required', message: 'Title is required' },
      { type: 'minLength', value: 5, message: 'Title must be at least 5 characters' },
      { type: 'maxLength', value: 100, message: 'Title must be less than 100 characters' }
    ],
    description: [
      { type: 'required', message: 'Description is required' },
      { type: 'minLength', value: 20, message: 'Description must be at least 20 characters' }
    ],
    price: [
      { type: 'required', message: 'Price is required' },
      { type: 'custom', validator: (value) => value > 0, message: 'Price must be greater than 0' }
    ]
  };

  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: {
      title: '',
      description: '',
      price: 0,
      boatType: '',
      year: new Date().getFullYear(),
      location: { state: '', city: '' }
    },
    validationSchema,
    onSubmit: async (data) => {
      const listing = await listingService.createListing(data);
      navigate(`/listings/${listing.id}`);
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Boat Title"
        value={values.title}
        onChange={handleChange('title')}
        onBlur={handleBlur('title')}
        error={errors.title}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={values.description}
          onChange={handleChange('description')}
          onBlur={handleBlur('description')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Price ($)"
          value={values.price.toString()}
          onChange={handleChange('price')}
          onBlur={handleBlur('price')}
          error={errors.price}
          required
        />
        
        <Input
          type="number"
          label="Year"
          value={values.year.toString()}
          onChange={handleChange('year')}
          onBlur={handleBlur('year')}
          required
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
        size="lg"
      >
        Create Listing
      </Button>
    </form>
  );
};
```

---

## 📊 **Data Visualization**

### **Charts, Dashboards & Reporting Components**

#### **Chart Components**
```typescript
interface ChartProps {
  data: any[];
  width?: number;
  height?: number;
  className?: string;
}

// Line Chart for Analytics
export const LineChart: React.FC<ChartProps & {
  xKey: string;
  yKey: string;
  color?: string;
}> = ({ data, xKey, yKey, color = '#3b82f6', width = 400, height = 300 }) => {
  return (
    <ResponsiveContainer width={width} height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

// Bar Chart for Comparisons
export const BarChart: React.FC<ChartProps & {
  xKey: string;
  yKey: string;
  color?: string;
}> = ({ data, xKey, yKey, color = '#10b981' }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={yKey} fill={color} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
```

#### **Dashboard Components**
```typescript
// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'increase',
  icon,
  loading = false
}) => {
  const changeColor = changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  const changeIcon = changeType === 'increase' ? '↗' : '↘';

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm ${changeColor}`}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-100 rounded-full">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

// Admin Dashboard Example
const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery('admin-stats', () =>
    adminService.getStats()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={stats?.users.total || 0}
          change={stats?.users.growth}
          icon={<UsersIcon className="w-6 h-6 text-blue-600" />}
          loading={isLoading}
        />
        <MetricCard
          title="Active Listings"
          value={stats?.listings.active || 0}
          change={stats?.listings.growth}
          icon={<DocumentIcon className="w-6 h-6 text-green-600" />}
          loading={isLoading}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${stats?.revenue.monthly || 0}`}
          change={stats?.revenue.growth}
          icon={<CurrencyDollarIcon className="w-6 h-6 text-purple-600" />}
          loading={isLoading}
        />
        <MetricCard
          title="System Uptime"
          value={`${stats?.uptime || 99.9}%`}
          icon={<ServerIcon className="w-6 h-6 text-orange-600" />}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">User Registration Trend</h3>
          <LineChart
            data={stats?.userGrowth || []}
            xKey="date"
            yKey="users"
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Listing Categories</h3>
          <BarChart
            data={stats?.listingsByCategory || []}
            xKey="category"
            yKey="count"
          />
        </Card>
      </div>
    </div>
  );
};
```

---

## ♿ **Accessibility Standards**

### **WCAG Compliance & Inclusive Design**

#### **Accessibility Hooks**
```typescript
// Screen reader announcements
export const useScreenReader = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};

// Focus management
export const useFocusManagement = () => {
  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  };

  const trapFocus = (containerSelector: string) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  };

  return { focusElement, trapFocus };
};
```

#### **Accessible Component Examples**
```typescript
// Accessible Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const { trapFocus } = useFocusManagement();

  useEffect(() => {
    if (isOpen) {
      const cleanup = trapFocus('.modal-content');
      return cleanup;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div className="modal-content bg-white rounded-lg p-6 w-full max-w-md mx-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-lg font-medium">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Accessible Skip Link
export const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded z-50"
  >
    Skip to main content
  </a>
);
```

#### **Accessibility Guidelines**
- **Semantic HTML**: Use proper heading hierarchy (h1-h6)
- **ARIA Labels**: Provide descriptive labels for interactive elements  
- **Color Contrast**: Maintain WCAG AA contrast ratios (4.5:1)
- **Keyboard Navigation**: Ensure all functionality is keyboard accessible
- **Screen Reader Support**: Test with screen readers (VoiceOver, NVDA)
- **Focus Management**: Visible focus indicators and logical tab order
- **Alternative Text**: Descriptive alt text for images
- **Form Labels**: Properly associated labels for form inputs

---

**📅 Last Updated**: October 2025  
**📝 Version**: 1.0.0  
**👥 Maintained By**: HarborList Development Team