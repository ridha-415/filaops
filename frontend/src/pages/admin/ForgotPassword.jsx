/**
 * ForgotPassword - Request password reset
 *
 * Allows users to request a password reset by submitting their email.
 * The request will be sent to admin for approval.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../config/api";
import { useToast } from "../../components/Toast";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/password-reset/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        // If reset_url is provided, email is not configured - show link directly
        if (data.reset_url) {
          setSubmitted(true);
          setResetUrl(data.reset_url);
          toast.success("Password reset link generated!");
        } else {
          setSubmitted(true);
          toast.success(data.message || "Password reset request submitted");
        }
      } else {
        const errorMsg =
          data.detail ||
          data.message ||
          "Failed to submit password reset request";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link
              to="/"
              className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent"
            >
              FilaOps
            </Link>
          </div>

          {/* Success Message */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-4">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {resetUrl ? "Password Reset Link Ready" : "Request Submitted"}
              </h2>
              {resetUrl ? (
                <>
                  <p className="text-gray-400 mb-4">
                    Your password reset link has been generated. Click the
                    button below to reset your password.
                  </p>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-2">Reset Link:</p>
                    <p className="text-blue-400 text-sm break-all">
                      {window.location.origin}
                      {resetUrl}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to={resetUrl}
                      className="inline-block px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all"
                    >
                      Reset My Password
                    </Link>
                    <Link
                      to="/admin/login"
                      className="inline-block px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                    >
                      Back to Login
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-400 mb-6">
                    If an account exists with this email, a password reset
                    request has been submitted for review. An administrator will
                    review your request and you will receive an email with reset
                    instructions if approved.
                  </p>
                  <Link
                    to="/admin/login"
                    className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all"
                  >
                    Back to Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent"
          >
            FilaOps
          </Link>
          <h1 className="text-xl text-white mt-4">Reset Password</h1>
          <p className="text-gray-400 mt-2">
            Enter your email to request a password reset
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </button>

            <div className="text-center">
              <Link
                to="/admin/login"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-blue-400 font-medium mb-1">
                  Admin Approval Required
                </h3>
                <p className="text-blue-300 text-sm">
                  Your password reset request will be reviewed by an
                  administrator. You will receive an email with reset
                  instructions if approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
