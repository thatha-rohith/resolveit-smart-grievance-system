// Complete ApiClient class with all methods
class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:8080'
  }

  getHeaders(includeToken = true, isFormData = false) {
    const headers = {}
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }
    
    if (includeToken) {
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  }

  async request(url, method = 'GET', data = null, includeToken = true, isBlob = false) {
    const isFormData = data instanceof FormData
    const options = {
      method,
      headers: this.getHeaders(includeToken, isFormData),
      credentials: 'include'
    }
    
    if (data && method !== 'GET') {
      if (isFormData) {
        options.body = data
      } else {
        options.body = JSON.stringify(data)
      }
    }
    
    console.log(`📤 ${method} ${url}`, data ? 'with data' : '')
    
    try {
      const response = await fetch(`${this.baseURL}${url}`, options)
      
      console.log(`📥 Response status: ${response.status} ${response.statusText}`)
      
      // Handle blob response for file downloads
      if (isBlob) {
        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `Download failed: ${response.status}`
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorJson.message || errorMessage
          } catch {
            // Not JSON, use text as is
          }
          throw new Error(errorMessage)
        }
        return await response.blob()
      }
      
      // Handle 204 No Content
      if (response.status === 204) {
        console.log(`✅ ${method} ${url} - Success (No Content)`)
        return { success: true }
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.log(`📥 Response text:`, text)
        
        if (!response.ok) {
          throw {
            status: response.status,
            statusText: response.statusText,
            data: { message: text },
            message: `Request failed with status ${response.status}`
          }
        }
        
        return { success: true, data: text }
      }
      
      const responseData = await response.json()
      console.log(`✅ ${method} ${url} - Success:`, responseData)
      
      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          message: responseData.error || responseData.message || `Request failed with status ${response.status}`
        }
      }
      
      return responseData
      
    } catch (error) {
      console.error(`❌ ${method} ${url} - Error:`, error)
      
      // If error is already processed, rethrow it
      if (error.status) {
        throw error
      }
      
      // Handle network errors
      throw {
        status: 0,
        statusText: 'Network Error',
        data: { error: 'Network connection failed' },
        message: 'Network error. Please check your connection.'
      }
    }
  }

  // ==================== AUTH API ====================
  auth = {
    login: (credentials) => this.request('/auth/login', 'POST', credentials, false),
    register: (userData) => this.request('/auth/register', 'POST', userData, false),
    getMe: () => this.request('/auth/me', 'GET'),
    validateToken: () => this.request('/auth/validate-token', 'GET'),
    logout: () => this.request('/auth/logout', 'POST')
  }

  // ==================== DASHBOARD API ====================
  dashboard = {
    getAdminDashboard: () => this.request('/api/dashboard/admin', 'GET'),
    getEmployeeDashboard: () => this.request('/api/dashboard/employee', 'GET'),
    getUserDashboard: () => this.request('/api/dashboard/user', 'GET'),
    getSeniorDashboard: () => this.request('/api/dashboard/senior', 'GET')
  }

  // ==================== SENIOR REQUEST API ====================
  seniorRequest = {
    submitRequest: (data) => this.request('/api/senior-requests', 'POST', data),
    getMyRequest: () => this.request('/api/senior-requests/my-request', 'GET'),
    cancelRequest: (id) => this.request(`/api/senior-requests/${id}`, 'DELETE'),
    checkEligibility: () => this.request('/api/senior-requests/eligibility', 'GET'),
    
    // Admin endpoints
    getAllRequests: () => this.request('/api/senior-requests/admin/all', 'GET'),
    getPendingRequests: () => this.request('/api/senior-requests/admin/pending', 'GET'),
    approveRequest: (requestId, adminNotes = null) => {
      const data = adminNotes ? { adminNotes } : {}
      return this.request(`/api/senior-requests/admin/${requestId}/approve`, 'PUT', data)
    },
    rejectRequest: (requestId, adminNotes = null) => {
      const data = adminNotes ? { adminNotes } : {}
      return this.request(`/api/senior-requests/admin/${requestId}/reject`, 'PUT', data)
    }
  }

  // ==================== ESCALATION API ====================
  escalation = {
    // Main escalation endpoints
    escalateComplaint: (id, data) => this.request(`/api/complaints/${id}/escalate`, 'POST', data),
    getEscalatedComplaints: () => this.request('/api/escalated-complaints', 'GET'),
    getComplaintsRequiringEscalation: () => this.request('/api/complaints/requiring-escalation', 'GET'),
    getEscalationStats: () => this.request('/api/escalation/stats', 'GET'),
    
    // Test and trigger endpoints (Admin only)
    triggerAutoEscalation: () => this.request('/api/escalation/trigger-auto', 'POST'),
    checkEscalationStatus: () => this.request('/api/escalation/check-status', 'GET')
  }

  // ==================== INTERNAL NOTES API ====================
  internalNotes = {
    addNote: (complaintId, data) => this.request(`/api/complaints/${complaintId}/notes`, 'POST', data),
    getNotes: (complaintId) => this.request(`/api/complaints/${complaintId}/notes`, 'GET'),
    getMentions: () => this.request('/api/notes/mentions', 'GET'),
    deleteNote: (noteId) => this.request(`/api/notes/${noteId}`, 'DELETE')
  }

  // ==================== INSTANT EXPORT API ====================
  export = {
    // Instant download endpoints (no need for async requests)
    downloadComplaints: (format, filters = {}) => {
      const params = new URLSearchParams()
      
      // Add filters to params
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.urgency) params.append('urgency', filters.urgency)
      
      const queryString = params.toString()
      const url = `/api/export/complaints/${format}${queryString ? `?${queryString}` : ''}`
      
      console.log(`📥 Downloading complaints: ${url}`)
      return this.request(url, 'GET', null, true, true)
    },
    
    downloadPerformanceReport: (format, filters = {}) => {
      const params = new URLSearchParams()
      
      // Add filters to params
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const queryString = params.toString()
      const url = `/api/export/performance/${format}${queryString ? `?${queryString}` : ''}`
      
      console.log(`📥 Downloading performance report: ${url}`)
      return this.request(url, 'GET', null, true, true)
    },
    
    downloadDashboardData: (format) => {
      const url = `/api/export/dashboard/${format}`
      console.log(`📥 Downloading dashboard data: ${url}`)
      return this.request(url, 'GET', null, true, true)
    },
    
    // Legacy async export endpoints (if you still need them)
    requestExport: (data) => {
      console.warn('⚠️ Async export is deprecated. Use instant download methods instead.')
      return this.request('/api/export/request', 'POST', data)
    },
    getMyExports: () => {
      console.warn('⚠️ Async export is deprecated. Use instant download methods instead.')
      return this.request('/api/export/my-requests', 'GET')
    },
    downloadExport: (id) => {
      console.warn('⚠️ Async export is deprecated. Use instant download methods instead.')
      return this.request(`/api/export/download/${id}`, 'GET', null, true, true)
    }
  }

  // ==================== USER API ====================
  user = {
    getSeniorEmployees: () => this.request('/api/users/senior-employees', 'GET'),
    getAllUsers: () => this.request('/api/users', 'GET'),
    getUserById: (id) => this.request(`/api/users/${id}`, 'GET'),
    updateUserRole: (id, role) => this.request(`/api/users/${id}/role`, 'PUT', { role }),
    getEmployeeStats: (id) => this.request(`/api/users/${id}/stats`, 'GET')
  }

  // ==================== COMPLAINT API ====================
  complaint = {
    // Submission without files (JSON)
    submitComplaint: (complaintData, isAnonymous = false) => {
      const url = '/complaints/submit'
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaintData)
      }
      
      // Only add auth header for non-anonymous complaints
      if (!isAnonymous) {
        const token = localStorage.getItem('token')
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`
        }
      }
      
      return fetch(`${this.baseURL}${url}`, options)
        .then(response => response.json())
        .then(data => {
          console.log('✅ Complaint submission response:', data)
          return data
        })
        .catch(error => {
          console.error('❌ Complaint submission error:', error)
          throw error
        })
    },
    
    // Submission with files (multipart/form-data)
    submitComplaintWithAttachments: (formData, isAnonymous = false) => {
      const url = '/complaints/submit-with-attachments'
      const options = {
        method: 'POST',
        body: formData
      }
      
      // Only add auth header for non-anonymous complaints
      if (!isAnonymous) {
        const token = localStorage.getItem('token')
        if (token) {
          options.headers = {
            'Authorization': `Bearer ${token}`
          }
        }
      }
      
      return fetch(`${this.baseURL}${url}`, options)
        .then(response => response.json())
        .then(data => {
          console.log('✅ Complaint with attachments submission response:', data)
          return data
        })
        .catch(error => {
          console.error('❌ Complaint with attachments submission error:', error)
          throw error
        })
    },
    
    // Retrieval
    getMyComplaints: () => this.request('/complaints/my', 'GET'),
    getPublicComplaints: () => this.request('/public/complaints', 'GET', null, false),
    getComplaintById: (id) => this.request(`/complaints/${id}`, 'GET'),
    getAllComplaints: () => this.request('/complaints', 'GET'),
    
    // Escalated complaints
    getEscalatedComplaints: () => this.request('/complaints/escalated/my', 'GET'),
    
    // Timeline and history
    getTimeline: (id) => this.request(`/complaints/${id}/timeline`, 'GET'),
    getStatusHistory: (id) => this.request(`/complaints/${id}/history`, 'GET'),
    
    // Status updates
    updateComplaintStatus: (complaintId, newStatus, comment = null, internalNote = false) => {
      const data = {}
      if (comment && comment.trim()) data.comment = comment.trim()
      if (internalNote !== undefined) data.internalNote = internalNote
      
      const url = `/complaints/${complaintId}/status?status=${newStatus}`
      return this.request(url, 'PUT', Object.keys(data).length > 0 ? data : null)
    },
    
    // Alternative method with object
    updateComplaint: (complaintId, updateData) => {
      const { status, comment, internalNote } = updateData
      if (!status) {
        throw new Error('Status is required')
      }
      
      const data = {}
      if (comment && comment.trim()) data.comment = comment.trim()
      if (internalNote !== undefined) data.internalNote = internalNote
      
      const url = `/complaints/${complaintId}/status?status=${status}`
      return this.request(url, 'PUT', Object.keys(data).length > 0 ? data : null)
    },
    
    // Admin updates
    updateComplaintAdmin: (id, data) => this.request(`/complaints/${id}`, 'PUT', data),
    
    // Search and filter
    searchComplaints: (params) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/complaints/search?${queryString}`, 'GET')
    },
    
    // Stats
    getComplaintStats: () => this.request('/complaints/stats', 'GET'),
    
    // Get complaints by category
    getComplaintsByCategory: (category) => this.request(`/complaints/category/${category}`, 'GET'),
    
    // Get complaints by status
    getComplaintsByStatus: (status) => this.request(`/complaints/status/${status}`, 'GET')
  }

  // ==================== COMMENT API ====================
  comment = {
    getComments: (complaintId) => this.request(`/complaints/${complaintId}/comments`, 'GET', null, false),
    addComment: (complaintId, commentText) => 
      this.request(`/complaints/${complaintId}/comments`, 'POST', { comment: commentText }),
    updateComment: (commentId, commentText) => 
      this.request(`/comments/${commentId}`, 'PUT', { comment: commentText }),
    deleteComment: (commentId) => this.request(`/comments/${commentId}`, 'DELETE'),
    getCommentCount: (complaintId) => this.request(`/complaints/${complaintId}/comments/count`, 'GET', null, false)
  }

  // ==================== LIKE API ====================
  like = {
    toggleLike: (complaintId) => this.request(`/complaints/${complaintId}/like`, 'POST'),
    getLikeCount: (complaintId) => this.request(`/complaints/${complaintId}/like/count`, 'GET', null, false),
    getLikeStatus: (complaintId) => this.request(`/complaints/${complaintId}/like/status`, 'GET'),
    getUserLikes: () => this.request('/likes/my', 'GET')
  }

  // ==================== ATTACHMENT API ====================
  attachment = {
    uploadAttachment: (complaintId, formData) => 
      this.request(`/complaints/${complaintId}/attachments`, 'POST', formData),
    getAttachments: (complaintId) => this.request(`/complaints/${complaintId}/attachments`, 'GET'),
    downloadAttachment: (complaintId, attachmentId) => 
      this.request(`/complaints/${complaintId}/attachments/${attachmentId}`, 'GET', null, true, true),
    deleteAttachment: (attachmentId) => this.request(`/attachments/${attachmentId}`, 'DELETE')
  }

  // ==================== EMPLOYEE REQUEST API ====================
  employeeRequest = {
    submitRequest: (reason) => this.request('/api/employee-request', 'POST', { reason }),
    getRequestStatus: () => this.request('/api/employee-request/status', 'GET'),
    cancelRequest: (id) => this.request(`/api/employee-request/${id}`, 'DELETE'),
    
    // Admin endpoints
    getAllRequests: () => this.request('/admin/employee-requests/all', 'GET'),
    getPendingRequests: () => this.request('/admin/employee-requests', 'GET'),
    approveRequest: (id, data = {}) => this.request(`/admin/employee-requests/${id}/approve`, 'PUT', data),
    rejectRequest: (id, notes = null) => {
      const data = notes ? { adminNotes: notes } : {}
      return this.request(`/admin/employee-requests/${id}/reject`, 'PUT', data)
    }
  }

  // ==================== ADMIN API ====================
  admin = {
    // Complaints management
    getAllComplaints: () => this.request('/admin/complaints', 'GET'),
    getComplaintDetails: (id) => this.request(`/admin/complaints/${id}`, 'GET'),
    updateComplaint: (id, data) => this.request(`/admin/complaints/${id}`, 'PUT', data),
    
    // Status update for complaints
    updateComplaintStatus: (complaintId, updateData) => {
      const { status, comment, internalNote, assignEmployeeId } = updateData
      
      const data = {}
      if (status) data.status = status
      if (comment && comment.trim()) data.comment = comment.trim()
      if (internalNote !== undefined) data.internalNote = internalNote
      if (assignEmployeeId) data.assignEmployeeId = assignEmployeeId
      
      return this.request(`/admin/complaints/${complaintId}`, 'PUT', data)
    },
    
    assignComplaint: (complaintId, employeeId) => 
      this.request(`/admin/complaints/${complaintId}/assign`, 'PUT', { assignEmployeeId: employeeId }),
    
    // Employees management
    getEmployees: () => this.request('/admin/employees', 'GET'),
    getEmployeeDetails: (id) => this.request(`/admin/employees/${id}`, 'GET'),
    updateEmployeeRole: (id, role) => this.request(`/admin/employees/${id}/role`, 'PUT', { role }),
    deactivateEmployee: (id) => this.request(`/admin/employees/${id}/deactivate`, 'PUT'),
    
    // Statistics
    getAdminStats: () => this.request('/admin/stats', 'GET'),
    getSystemMetrics: () => this.request('/admin/metrics', 'GET'),
    
    // Reports
    generateReport: (params) => this.request('/admin/reports/generate', 'POST', params),
    getReports: () => this.request('/admin/reports', 'GET')
  }

  // ==================== EMPLOYEE API ====================
  employee = {
    // Complaints assigned to employee
    getAssignedComplaints: () => this.request('/employee/complaints', 'GET'),
    getComplaintDetails: (id) => this.request(`/employee/complaints/${id}`, 'GET'),
    
    // Status update with optional comment and internal note
    updateComplaintStatus: (id, status, comment = null, internalNote = false) => {
      const data = {}
      if (comment && comment.trim()) data.comment = comment.trim()
      if (internalNote) data.internalNote = internalNote
      
      // Send as query parameter for status, body for other data
      const url = `/employee/complaints/${id}/status?status=${status}`
      return this.request(url, 'PUT', Object.keys(data).length > 0 ? data : null)
    },
    
    // Alternative method that accepts an object
    updateComplaint: (id, updateData) => {
      const { status, comment, internalNote } = updateData
      if (!status) {
        throw new Error('Status is required')
      }
      
      const data = {}
      if (comment && comment.trim()) data.comment = comment.trim()
      if (internalNote !== undefined) data.internalNote = internalNote
      
      const url = `/employee/complaints/${id}/status?status=${status}`
      return this.request(url, 'PUT', Object.keys(data).length > 0 ? data : null)
    },
    
    // Comments
    addComment: (id, commentText) => 
      this.request(`/employee/complaints/${id}/comments`, 'POST', { comment: commentText }),
    
    // Employee stats
    getMyStats: () => this.request('/employee/stats', 'GET'),
    getPerformance: () => this.request('/employee/performance', 'GET'),
    
    // Escalated complaints (for senior employees)
    getMyEscalatedComplaints: () => this.request('/employee/escalated', 'GET')
  }

  // ==================== SENIOR EMPLOYEE API ====================
  senior = {
    // Dashboard
    getSeniorDashboard: () => this.request('/api/dashboard/senior', 'GET'),
    
    // Escalated complaints
    getAllEscalatedComplaints: () => this.request('/api/senior/escalated/all', 'GET'),
    getMyEscalatedComplaints: () => this.request('/api/senior/escalated/my', 'GET'),
    getLoadDistribution: () => this.request('/api/senior/load-distribution', 'GET'),
    
    // De-escalate
    deescalateComplaint: (id, reason) => {
      const data = reason ? { reason } : {}
      return this.request(`/api/senior/complaints/${id}/deescalate`, 'POST', data)
    },
    
    // Escalate complaint
    escalateComplaint: (id, data) => this.request(`/api/complaints/${id}/escalate`, 'POST', data),
    
    // Team management
    getTeamMembers: () => this.request('/api/senior/team', 'GET'),
    assignToTeamMember: (complaintId, employeeId) => 
      this.request(`/api/senior/complaints/${complaintId}/assign-to-team`, 'PUT', { employeeId }),
    
    // Reports
    generateTeamReport: (params) => this.request('/api/senior/reports/team', 'POST', params)
  }

  // ==================== PUBLIC API ====================
  public = {
    getPublicComplaints: () => this.request('/public/complaints', 'GET', null, false),
    getPublicComplaint: (id) => this.request(`/public/complaints/${id}`, 'GET', null, false),
    getPublicComments: (complaintId) => this.request(`/public/complaints/${complaintId}/comments`, 'GET', null, false),
    getPublicLikeCount: (complaintId) => this.request(`/public/complaints/${complaintId}/likes`, 'GET', null, false),
    
    // Categories and filters
    getCategories: () => this.request('/public/categories', 'GET', null, false),
    getStatistics: () => this.request('/public/statistics', 'GET', null, false)
  }

  // ==================== UTILITY METHODS ====================
  
  // Helper method to trigger file download
  triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }

  // Instant export helper methods
  instantExport = {
    // Download complaints with auto filename
    downloadComplaintsFile: async (format, filters = {}, customFilename = null) => {
      try {
        const blob = await this.export.downloadComplaints(format, filters)
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
        const userEmail = localStorage.getItem('userEmail') || 'user'
        const safeEmail = userEmail.replace(/[@.]/g, '_')
        
        const filename = customFilename || `complaints_${safeEmail}_${timestamp}.${format.toLowerCase()}`
        this.triggerDownload(blob, filename)
        return { success: true, filename }
      } catch (error) {
        console.error('Download failed:', error)
        throw error
      }
    },
    
    // Download performance report with auto filename
    downloadPerformanceFile: async (format, filters = {}, customFilename = null) => {
      try {
        const blob = await this.export.downloadPerformanceReport(format, filters)
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
        const userEmail = localStorage.getItem('userEmail') || 'user'
        const safeEmail = userEmail.replace(/[@.]/g, '_')
        
        const filename = customFilename || `performance_${safeEmail}_${timestamp}.${format.toLowerCase()}`
        this.triggerDownload(blob, filename)
        return { success: true, filename }
      } catch (error) {
        console.error('Download failed:', error)
        throw error
      }
    },
    
    // Download dashboard data with auto filename
    downloadDashboardFile: async (format, customFilename = null) => {
      try {
        const blob = await this.export.downloadDashboardData(format)
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
        const userEmail = localStorage.getItem('userEmail') || 'user'
        const safeEmail = userEmail.replace(/[@.]/g, '_')
        const userRole = localStorage.getItem('userRole') || 'user'
        
        const filename = customFilename || `${userRole}_dashboard_${safeEmail}_${timestamp}.${format.toLowerCase()}`
        this.triggerDownload(blob, filename)
        return { success: true, filename }
      } catch (error) {
        console.error('Download failed:', error)
        throw error
      }
    },
    
    // Quick download methods for common scenarios
    quickDownload: {
      // Download all complaints as CSV
      allComplaintsCSV: (filters = {}) => this.instantExport.downloadComplaintsFile('CSV', filters),
      
      // Download today's complaints as Excel
      todaysComplaintsExcel: () => {
        const today = new Date().toISOString().split('T')[0]
        return this.instantExport.downloadComplaintsFile('EXCEL', { startDate: today })
      },
      
      // Download performance report as PDF
      performancePDF: (filters = {}) => this.instantExport.downloadPerformanceFile('PDF', filters),
      
      // Download admin dashboard as Excel
      adminDashboardExcel: () => this.instantExport.downloadDashboardFile('EXCEL')
    }
  }

  // Upload file helper
  uploadFile = (url, file, additionalData = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key])
    })
    
    return this.request(url, 'POST', formData)
  }

  // Health check
  healthCheck = () => this.request('/actuator/health', 'GET', null, false)
}

// Create single instance
const api = new ApiClient()

// Export all API modules
export const authAPI = api.auth
export const dashboardAPI = api.dashboard
export const seniorRequestAPI = api.seniorRequest
export const escalationAPI = api.escalation
export const internalNotesAPI = api.internalNotes
export const exportAPI = api.export
export const userAPI = api.user
export const complaintAPI = api.complaint
export const commentAPI = api.comment
export const likeAPI = api.like
export const attachmentAPI = api.attachment
export const employeeRequestAPI = api.employeeRequest
export const adminAPI = api.admin
export const employeeAPI = api.employee
export const seniorAPI = api.senior
export const publicAPI = api.public

// Export instant export helpers
export const instantExportAPI = api.instantExport

// Export default api instance
export default api