import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (replace with database in production)
const notifications: any[] = [];

/**
 * GET /api/notifications
 * Fetch notifications for current user
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    // For now, accept from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Filter notifications for this user
    const userNotifications = notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create new notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, actionUrl, metadata } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(notification);

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAsRead } = body;

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds must be an array' },
        { status: 400 }
      );
    }

    const updated = notifications.map(notification => {
      if (notificationIds.includes(notification.id)) {
        return { ...notification, read: markAsRead !== false };
      }
      return notification;
    });

    // Update in storage
    notifications.length = 0;
    notifications.push(...updated);

    return NextResponse.json({ success: true, updated: notificationIds.length });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
