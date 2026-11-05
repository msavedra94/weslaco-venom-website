
exports.handler = async () => {
  // Payment reminders and overdue notifications
  // are disabled because registrations
  // no longer have a payment deadline.

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Payment reminders disabled',
      reminded: 0,
      overdue: 0,
      expired: 0
    })
  };
};
