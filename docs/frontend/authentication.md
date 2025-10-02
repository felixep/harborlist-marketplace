# 🔐 Authentication & Authorization

## 📋 **Overview**

HarborList implements a comprehensive authentication system with JWT tokens, role-based access control, and multi-factor authentication for administrators. The frontend handles authentication state management, protected routes, and security best practices.

---

## 🔑 **User Authentication**

### **Login/Logout Flows & Session Management**

#### **Authentication Context**
```typescript
interface AuthContext {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  isLoading: boolean;
}

interface User {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  lastLogin: string;
  mfaEnabled: boolean;
}
```

#### **Authentication Hook Implementation**
```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('harborlist_token', response.token);
    localStorage.setItem('harborlist_refresh_token', response.refreshToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('harborlist_token');
    localStorage.removeItem('harborlist_refresh_token');
  };

  // ... other methods
};
```

### **Registration Flow**
```typescript
interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  agreeToTerms: boolean;
}

const RegistrationForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<RegistrationData>();
  const { login } = useAuth();

  const onSubmit = async (data: RegistrationData) => {
    try {
      await authService.register(data);
      // Auto-login after successful registration
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields with validation */}
    </form>
  );
};
```

### **Token Management**
- **Automatic Refresh**: Tokens refreshed 5 minutes before expiration
- **Secure Storage**: Tokens stored in localStorage with HttpOnly cookies consideration
- **Token Validation**: Client-side JWT validation for expired tokens
- **Logout on Expiry**: Automatic logout when refresh fails

---

## 👤 **Admin Portal**

### **Role-Based Access Control & Permissions**

#### **Admin Authentication Flow**
```typescript
interface AdminAuthState {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  verifyMFA: (code: string) => Promise<void>;
  setupMFA: () => Promise<MFASetup>;
}

interface AdminUser extends User {
  role: 'admin';
  permissions: AdminPermissions;
  lastAdminLogin: string;
  mfaVerified: boolean;
}

interface AdminPermissions {
  users: { read: boolean; write: boolean; delete: boolean };
  listings: { read: boolean; moderate: boolean; delete: boolean };
  analytics: { view: boolean; export: boolean };
  system: { configure: boolean; maintenance: boolean };
}
```

#### **MFA Setup Component**
```typescript
const MFASetup: React.FC = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  const setupMFA = async () => {
    const mfaData = await adminService.setupMFA();
    setQrCode(mfaData.qrCode);
    setBackupCodes(mfaData.backupCodes);
  };

  const verifySetup = async () => {
    await adminService.verifyMFASetup(verificationCode);
    // Redirect to admin dashboard
  };

  return (
    <div className="mfa-setup">
      <h2>Set Up Multi-Factor Authentication</h2>
      
      {/* QR Code Display */}
      <div className="qr-code">
        <img src={qrCode} alt="MFA QR Code" />
        <p>Scan this QR code with your authenticator app</p>
      </div>

      {/* Backup Codes */}
      <div className="backup-codes">
        <h3>Backup Codes (Save these securely)</h3>
        {backupCodes.map((code, index) => (
          <code key={index}>{code}</code>
        ))}
      </div>

      {/* Verification */}
      <input
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
        placeholder="Enter verification code"
      />
      <button onClick={verifySetup}>Verify and Complete Setup</button>
    </div>
  );
};
```

### **Permission-Based UI Rendering**
```typescript
const PermissionGate: React.FC<{
  resource: keyof AdminPermissions;
  action: string;
  children: React.ReactNode;
}> = ({ resource, action, children }) => {
  const { adminUser } = useAdminAuth();
  
  if (!adminUser?.permissions[resource]?.[action]) {
    return null;
  }
  
  return <>{children}</>;
};

// Usage example
const AdminUserManagement = () => (
  <div>
    <PermissionGate resource="users" action="read">
      <UserList />
    </PermissionGate>
    
    <PermissionGate resource="users" action="write">
      <UserEditButton />
    </PermissionGate>
    
    <PermissionGate resource="users" action="delete">
      <UserDeleteButton />
    </PermissionGate>
  </div>
);
```

---

## 🛡️ **Protected Routes**

### **Route Guards & Navigation Patterns**

#### **Route Protection Implementation**
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'user',
  redirectTo = '/login'
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

#### **Route Configuration**
```typescript
const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/listings" element={<PublicListingsPage />} />
    <Route path="/listings/:id" element={<ListingDetailPage />} />

    {/* Protected User Routes */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
    } />
    <Route path="/my-listings" element={
      <ProtectedRoute>
        <MyListingsPage />
      </ProtectedRoute>
    } />
    <Route path="/create-listing" element={
      <ProtectedRoute>
        <CreateListingPage />
      </ProtectedRoute>
    } />

    {/* Admin Routes */}
    <Route path="/admin/*" element={
      <ProtectedRoute requiredRole="admin" redirectTo="/login">
        <AdminLayout>
          <AdminRoutes />
        </AdminLayout>
      </ProtectedRoute>
    } />

    {/* Error Routes */}
    <Route path="/unauthorized" element={<UnauthorizedPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
```

#### **Navigation Guards**
```typescript
const useNavigationGuard = () => {
  const { isAuthenticated, user } = useAuth();
  
  const canAccess = (route: string): boolean => {
    const protectedRoutes = ['/dashboard', '/my-listings', '/create-listing'];
    const adminRoutes = ['/admin'];
    
    if (protectedRoutes.some(r => route.startsWith(r))) {
      return isAuthenticated;
    }
    
    if (adminRoutes.some(r => route.startsWith(r))) {
      return isAuthenticated && user?.role === 'admin';
    }
    
    return true;
  };

  const guardedNavigate = (to: string) => {
    if (!canAccess(to)) {
      throw new Error(`Access denied to ${to}`);
    }
    // Proceed with navigation
  };

  return { canAccess, guardedNavigate };
};
```

---

## 🔒 **Security Features**

### **Error Boundaries & Security Best Practices**

#### **Authentication Error Boundary**
```typescript
interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  AuthErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log authentication errors
    console.error('Authentication error:', error, errorInfo);
    
    // Clear potentially corrupted auth state
    localStorage.removeItem('harborlist_token');
    localStorage.removeItem('harborlist_refresh_token');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error">
          <h2>Authentication Error</h2>
          <p>Please log in again to continue.</p>
          <button onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### **Security Headers & CSP**
```typescript
// Security configuration
export const securityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://s3.amazonaws.com"],
      connectSrc: ["'self'", "https://api.harborlist.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Prevent clickjacking
  frameGuard: { action: 'deny' },
  
  // XSS protection
  xssFilter: true,
  
  // Content type sniffing prevention
  noSniff: true,
  
  // HSTS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};
```

### **Input Sanitization**
```typescript
// XSS prevention utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000); // Limit length
};

// HTML encoding for display
export const encodeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Safe URL validation
export const isValidURL = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

### **Session Security**
```typescript
interface SessionConfig {
  timeout: number;          // 30 minutes
  warningTime: number;      // 5 minutes before timeout
  maxIdleTime: number;      // 2 hours max idle
}

const useSessionTimeout = (config: SessionConfig) => {
  const [timeLeft, setTimeLeft] = useState(config.timeout);
  const [showWarning, setShowWarning] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          logout();
          return 0;
        }
        if (prev <= config.warningTime && !showWarning) {
          setShowWarning(true);
        }
        return prev - 1;
      });
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, []);

  const extendSession = () => {
    setTimeLeft(config.timeout);
    setShowWarning(false);
  };

  return { timeLeft, showWarning, extendSession };
};
```

---

## 📱 **Mobile Authentication**

### **Mobile-Optimized Auth Flow**

#### **Responsive Authentication Forms**
```typescript
const MobileAuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <div className={`auth-form ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Optimized for touch interfaces */}
      <div className="form-container">
        {isLogin ? <LoginForm /> : <RegisterForm />}
      </div>
      
      {/* Touch-friendly toggle */}
      <button
        className="toggle-form-btn"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </div>
  );
};
```

#### **Biometric Authentication (Future)**
```typescript
// WebAuthn API for future biometric authentication
const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      window.navigator.credentials.create
    );
  }, []);

  const registerBiometric = async () => {
    if (!isSupported) return;

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "HarborList" },
          user: {
            id: new Uint8Array(16),
            name: "user@example.com",
            displayName: "User Name"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      });

      // Store credential and enable biometric login
      return credential;
    } catch (error) {
      console.error('Biometric registration failed:', error);
    }
  };

  return { isSupported, registerBiometric };
};
```

---

**📅 Last Updated**: October 2025  
**📝 Version**: 1.0.0  
**👥 Maintained By**: HarborList Development Team