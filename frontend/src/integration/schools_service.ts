import axiosInstance from "./axiosInstance";

export interface SchoolResponse {
  id: string;
  school_name: string;
  email_domain: string;
  created_at?: string;
  updated_at?: string;
}

export const schoolService = {
  /**
   * Fetch all schools
   */
  async getAllSchools(): Promise<SchoolResponse[]> {
    try {
      const response = await axiosInstance.get("/schools");
      return response.data.schools || [];
    } catch (error) {
      console.error("Failed to fetch schools:", error);
      throw error;
    }
  },

  /**
   * Fetch a specific school by ID
   */
  async getSchoolById(schoolId: string): Promise<SchoolResponse> {
    try {
      const response = await axiosInstance.get(`/schools/${schoolId}`);
      return response.data.school;
    } catch (error) {
      console.error(`Failed to fetch school ${schoolId}:`, error);
      throw error;
    }
  },

  /**
   * Find school by email domain
   */
  async findSchoolByEmailDomain(
    emailDomain: string,
  ): Promise<SchoolResponse | null> {
    try {
      const response = await axiosInstance.get(
        `/schools/domain/${emailDomain}`,
      );
      return response.data.school || null;
    } catch (error) {
      console.error(`Failed to find school for domain ${emailDomain}:`, error);
      return null;
    }
  },

  /**
   * Create a new school (admin only)
   */
  async createSchool(
    schoolName: string,
    emailDomain: string,
  ): Promise<SchoolResponse> {
    try {
      const response = await axiosInstance.post("/schools", {
        school_name: schoolName,
        email_domain: emailDomain,
      });
      return response.data.school;
    } catch (error) {
      console.error("Failed to create school:", error);
      throw error;
    }
  },

  /**
   * Update school information (admin only)
   */
  async updateSchool(
    schoolId: string,
    updates: Partial<Omit<SchoolResponse, "id" | "created_at" | "updated_at">>,
  ): Promise<SchoolResponse> {
    try {
      const response = await axiosInstance.put(`/schools/${schoolId}`, updates);
      return response.data.school;
    } catch (error) {
      console.error(`Failed to update school ${schoolId}:`, error);
      throw error;
    }
  },
};
