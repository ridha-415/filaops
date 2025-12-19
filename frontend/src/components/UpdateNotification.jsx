import { useState, useEffect } from "react";
import { useVersionCheck } from "../hooks/useVersionCheck";
import { getCurrentVersion, formatVersion } from "../utils/version";
import { API_URL } from "../config/api";
import { useToast } from "./Toast";

const DISMISSED_KEY = "filaops_update_dismissed";
const REMIND_LATER_KEY = "filaops_update_remind_later";
const REMIND_LATER_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

export default function UpdateNotification() {
  const { latestVersion, updateAvailable, loading } = useVersionCheck();
  const [isVisible, setIsVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();
  const currentVersion = getCurrentVersion();

  useEffect(() => {
    if (!updateAvailable || loading) {
      setIsVisible(false);
      return;
    }

    // Check if user has dismissed this version
    const dismissedVersion = localStorage.getItem(DISMISSED_KEY);
    if (dismissedVersion === latestVersion) {
      setIsVisible(false);
      return;
    }

    // Check if user asked to be reminded later
    const remindLater = localStorage.getItem(REMIND_LATER_KEY);
    if (remindLater) {
      const remindTime = parseInt(remindLater, 10);
      if (Date.now() < remindTime) {
        setIsVisible(false);
        return;
      }
      // Time has passed, clear the reminder
      localStorage.removeItem(REMIND_LATER_KEY);
    }

    setIsVisible(true);
  }, [updateAvailable, latestVersion, loading]);

  const handleDismiss = () => {
    if (latestVersion) {
      localStorage.setItem(DISMISSED_KEY, latestVersion);
    }
    setIsVisible(false);
  };

  const handleRemindLater = () => {
    const remindTime = Date.now() + REMIND_LATER_DURATION_MS;
    localStorage.setItem(REMIND_LATER_KEY, remindTime.toString());
    setIsVisible(false);
  };

  const handleUpdateNow = async () => {
    if (
      !confirm(
        "This will update FilaOps to the latest version. The system will be unavailable for a few minutes during the update. Continue?"
      )
    ) {
      return;
    }

    setUpdating(true);
    setUpdateStatus("Starting update...");
    setError(null); // Clear any previous errors

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Start the update
      const response = await fetch(
        `${API_URL}/api/v1/admin/system/update/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            version: latestVersion ? `v${formatVersion(latestVersion)}` : null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to start update");
      }

      toast.success("Update started! This may take a few minutes...");

      // Poll for update status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_URL}/api/v1/admin/system/update/status`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setUpdateStatus(status.progress || status.message);

            if (status.status === "success") {
              clearInterval(pollInterval);
              toast.success(
                "Update completed! The page will reload in 5 seconds..."
              );
              setTimeout(() => {
                window.location.reload();
              }, 5000);
            } else if (status.status === "error") {
              clearInterval(pollInterval);
              setUpdating(false);
              const errorMsg = status.error || "Unknown error";
              setError(errorMsg);
              toast.error(`Update failed: ${errorMsg}`);
            }
          }
        } catch (err) {
          // Continue polling even if one request fails
          console.warn("Failed to check update status:", err);
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (updating) {
          setUpdating(false);
          toast.warning(
            "Update is taking longer than expected. Please check manually."
          );
        }
      }, 600000);
    } catch (error) {
      setUpdating(false);
      setUpdateStatus(null);
      const errorMsg = error.message || "Failed to start update";
      setError(errorMsg);
      toast.error(`Failed to start update: ${errorMsg}`);
    }
  };

  // Show error banner if there's an error
  if (error) {
    return (
      <div className="bg-red-600/90 backdrop-blur-sm border-b border-red-500/50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-red-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-50 mb-1">
                Update Failed
              </h3>
              <p className="text-sm text-red-100 whitespace-pre-line">
                {error}
              </p>
              <p className="text-xs text-red-200/80 mt-2">
                <a
                  href="https://github.com/Blb3D/filaops/blob/main/UPGRADE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-100 underline"
                >
                  View manual upgrade instructions →
                </a>
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-red-50 transition-colors flex-shrink-0"
              aria-label="Close error"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isVisible || !updateAvailable || !latestVersion) {
    return null;
  }

  const releaseUrl = `https://github.com/Blb3D/filaops/releases/tag/v${formatVersion(
    latestVersion
  )}`;
  const upgradeGuideUrl =
    "https://github.com/Blb3D/filaops/blob/main/UPGRADE.md";

  return (
    <div className="bg-blue-600/90 backdrop-blur-sm border-b border-blue-500/50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-200"
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
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-50">
              <span className="font-semibold">New version available:</span>{" "}
              <span className="text-blue-200">
                v{formatVersion(currentVersion)}
              </span>{" "}
              →{" "}
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-100 hover:text-white underline font-semibold"
              >
                v{formatVersion(latestVersion)}
              </a>
            </p>
            <p className="text-xs text-blue-200/80 mt-0.5">
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-100 underline"
              >
                View release notes
              </a>
              {" · "}
              <a
                href={upgradeGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-100 underline"
              >
                Upgrade guide
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updating ? (
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <svg
                className="animate-spin h-4 w-4"
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
              <span>{updateStatus || "Updating..."}</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleUpdateNow}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-md transition-colors font-semibold"
              >
                Update Now
              </button>
              <button
                onClick={handleRemindLater}
                className="text-xs text-blue-200 hover:text-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-500/30 transition-colors"
              >
                Remind later
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-blue-200 hover:text-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-500/30 transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-blue-50 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
