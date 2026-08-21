/**
 * Xử lý lỗi API và hướng dẫn người dùng
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  suggestion?: string;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const message = error.message;

    // Rate limit error
    if (
      message.includes("giới hạn") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503")
    ) {
      return {
        message: "⏸️ Đã đạt giới hạn truy cập API",
        code: "RATE_LIMITED",
        suggestion: "Vui lòng tải lại sau 1-2 phút hoặc kiểm tra hạng thành viên tài khoản",
        status: 429,
      };
    }

    // Network error
    if (message.includes("fetch") || message.includes("network")) {
      return {
        message: "❌ Lỗi kết nối mạng",
        code: "NETWORK_ERROR",
        suggestion: "Kiểm tra kết nối internet và thử lại",
        status: 0,
      };
    }

    // Invalid data
    if (message.includes("JSON") || message.includes("parse")) {
      return {
        message: "⚠️ Dữ liệu không hợp lệ",
        code: "INVALID_DATA",
        suggestion: "Dữ liệu từ API có vấn đề. Vui lòng tải lại trang",
        status: 502,
      };
    }

    // Server error
    if (message.includes("500") || message.includes("server")) {
      return {
        message: "🔧 Lỗi server",
        code: "SERVER_ERROR",
        suggestion: "Server đang có vấn đề. Vui lòng thử lại sau",
        status: 500,
      };
    }

    // Generic error
    return {
      message: `Lỗi: ${message}`,
      code: "UNKNOWN_ERROR",
      suggestion: "Vui lòng thử lại hoặc liên hệ hỗ trợ",
    };
  }

  return {
    message: "❌ Lỗi không xác định",
    code: "UNKNOWN",
    suggestion: "Vui lòng thử lại",
  };
}

/**
 * Format error message cho hiển thị UI
 */
export function formatErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  if (parsed.suggestion) {
    return `${parsed.message}\n${parsed.suggestion}`;
  }
  return parsed.message;
}

/**
 * Check xem có phải rate limit error không
 */
export function isRateLimitError(error: unknown): boolean {
  const parsed = parseApiError(error);
  return parsed.code === "RATE_LIMITED";
}

/**
 * Check xem có phải temporary error không (có thể retry)
 */
export function isTemporaryError(error: unknown): boolean {
  const parsed = parseApiError(error);
  return [
    "RATE_LIMITED",
    "NETWORK_ERROR",
    "SERVER_ERROR",
  ].includes(parsed.code || "");
}
