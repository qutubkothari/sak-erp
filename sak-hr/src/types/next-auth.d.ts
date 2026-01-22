import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      employeeId?: string;
      department?: string;
      jobRole?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    employeeId?: string;
    department?: string;
    jobRole?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    employeeId?: string;
    department?: string;
    jobRole?: string;
  }
}
