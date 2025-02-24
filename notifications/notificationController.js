const Notification = require('./notificationModel');



const getNotificationController = async (req, res) => {
    const { userId } = req.params;

    // Check if userId is provided
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Fetch notifications directly from the database
        const notifications = await Notification.find({ receiver: userId }).sort({ timestamp: -1 });

        // Check if notifications exist for the user
        if (!notifications || notifications.length === 0) {
            return res.status(404).json({ message: 'No notifications found for this user' });
        }

        // Return the notifications
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};






module.exports ={ getNotificationController,
}