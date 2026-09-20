export interface Notification {
  id: string;
  userId: string;
  type: 'review_reminder' | 'cycle_started' | 'rating_published' | 'feedback_request' | 'approval_needed';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationInput {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}
