import axiosInstance from "./axiosInstance";

export type OTPPurpose =
  | "signup"
  | "login"
  | "forgot_password"
  | "change_email";

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  school_id?: string;
  topics?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OTPRequest {
  email: string;
  purpose: OTPPurpose;
}

export interface OTPVerifyRequest {
  email: string;
  otp_code: string;
  purpose: OTPPurpose;
}

export interface SignupWithOTPRequest {
  email: string;
  full_name: string;
  password: string;
  otp_code: string;
  school_id?: string;
  topics?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    school_id?: string;
    role: "user" | "moderator" | "admin";
    is_active: boolean;
    bio?: string;
    points: number;
  };
}

export interface OTPResponse {
  message: string;
  expiresIn: number;
}

export interface VerifyOTPResponse {
  verified: boolean;
  message: string;
}

export const authService = {
  /**
   * Request OTP for signup/login/password reset
   */
  async requestOTP(email: string, purpose: OTPPurpose): Promise<OTPResponse> {
    try {
      const response = await axiosInstance.post<OTPResponse>(
        "/auth/request-otp",
        {
          email,
          purpose,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to request OTP:", error);
      throw error;
    }
  },

  /**
   * Verify OTP without signup
   */
  async verifyOTP(
    email: string,
    otpCode: string,
    purpose: OTPPurpose,
  ): Promise<VerifyOTPResponse> {
    try {
      const response = await axiosInstance.post<VerifyOTPResponse>(
        "/auth/verify-otp",
        {
          email,
          otp_code: otpCode,
          purpose,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      throw error;
    }
  },

  /**
   * Complete signup with OTP verification
   */
  async signupWithOTP(params: SignupWithOTPRequest): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>("/auth/signup", {
        email: params.email,
        full_name: params.full_name,
        password: params.password,
        otp_code: params.otp_code,
        school_id: params.school_id,
        topics: params.topics || [],
      });
      return response.data;
    } catch (error) {
      console.error("Failed to sign up:", error);
      throw error;
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to login:", error);
      throw error;
    }
  },

  /**
   * Logout (clear tokens and session)
   */
  async logout(): Promise<void> {
    try {
      await axiosInstance.post("/auth/logout");
      // Clear local storage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Failed to logout:", error);
      // Still clear local storage even if request fails
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const response = await axiosInstance.post<AuthResponse>("/auth/refresh", {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<AuthResponse["user"]> {
    try {
      const response = await axiosInstance.get<AuthResponse>("/auth/me");
      return response.data.user;
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      throw error;
    }
  },

  /**
   * Reset password with OTP
   */
  async resetPasswordWithOTP(
    email: string,
    newPassword: string,
    otpCode: string,
  ): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.post("/auth/reset-password", {
        email,
        new_password: newPassword,
        otp_code: otpCode,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to reset password:", error);
      throw error;
    }
  },

  /**
   * Change email with OTP verification
   */
  async changeEmailWithOTP(
    newEmail: string,
    otpCode: string,
  ): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>(
        "/auth/change-email",
        {
          new_email: newEmail,
          otp_code: otpCode,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to change email:", error);
      throw error;
    }
  },
};
