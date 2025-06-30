# Group Order Payment Flow Documentation

## Complete Group Order Workflow

### 📋 Step-by-Step Process

**1. Create Group Order**
```javascript
POST /api/v1/advanced-orders/group
{
  "title": "Lunch Together - CS Building",
  "restaurant": "restaurant_id",
  "orderDeadline": "2024-01-15T11:30:00Z",
  "deliveryTime": "2024-01-15T12:30:00Z",
  "deliveryInfo": {
    "address": "Computer Science Building, Room 301",
    "landmark": "Near the main elevator",
    "instructions": "Call when you arrive"
  },
  "splitMethod": "individual",
  "isPublic": true
}
```

**2. Join Group Order**
```javascript
POST /api/v1/advanced-orders/group/{orderId}/join
// No body required - user automatically joins
```

**3. Add Meals to Your Order**
```javascript
POST /api/v1/advanced-orders/group/{orderId}/meals
{
  "meals": [
    {
      "meal": "meal_id_1",
      "quantity": 2
    },
    {
      "meal": "meal_id_2", 
      "quantity": 1
    }
  ]
}

// Response includes calculated subtotal
{
  "success": true,
  "data": {
    "subtotal": 25.50,
    "meals": [...],
    "groupTotal": 75.00
  }
}
```

**4. Check Payment Status**
```javascript
GET /api/v1/advanced-orders/group/{orderId}/payment-status

// Response shows who has paid and who hasn't
{
  "success": true,
  "data": {
    "yourPayment": {
      "amount": 25.50,
      "hasPaid": false
    },
    "groupSummary": {
      "totalParticipants": 3,
      "paidParticipants": 1,
      "unpaidParticipants": [
        {
          "username": "john_doe",
          "amount": 25.50
        },
        {
          "username": "jane_smith", 
          "amount": 18.00
        }
      ],
      "allPaid": false,
      "orderStatus": "open"
    }
  }
}
```

**5. Process Your Payment**
```javascript
POST /api/v1/advanced-orders/group/{orderId}/pay
// No body required - automatically charges your subtotal

// Response
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "amountPaid": 25.50,
    "newBalance": 74.50,
    "allPaid": false,
    "orderStatus": "open"
  }
}

// Automatic email sent to user:
// "Group Order Payment Confirmed"
// - Payment amount and new balance
// - Order details and restaurant info
// - Status update on waiting for other participants
```

**6. When All Participants Pay**
```javascript
// Automatic notifications sent to:
// - Restaurant: "New group order ready for review"
// - All participants: "Order sent to restaurant for preparation"

// Automatic emails sent to:
// - Each participant: "Group Order Sent to Restaurant!"
//   Contains: order details, delivery time, participant count
// - Restaurant: "New Group Order - All Payments Complete"
//   Contains: order value, participant count, delivery time

// Order status changes from "open" → "ready"
```

**7. Restaurant Processing**
```javascript
// Restaurant sees the order in their dashboard
GET /api/v1/restaurants/advanced-orders/group

// Restaurant accepts or declines
PUT /api/v1/restaurants/advanced-orders/group/{orderId}/status
{
  "status": "accepted",
  "reason": "Will be ready by delivery time"
}

// If accepted: Individual orders are created automatically
// Order status changes: "ready" → "confirmed"
```

**8. Food Delivery**
```javascript
// All food is prepared together
// Delivered to the single address specified in deliveryInfo
// All participants get their individual portions
```

## 💰 Payment Logic

### Individual Responsibility
- Each participant pays only for their own meals
- Money is deducted immediately when they click "Pay"
- No shared cost splitting (except delivery fee if applicable)

### Payment Requirements
- All participants must pay before order goes to restaurant
- If someone doesn't pay by deadline, order may be cancelled
- Refunds available if order is cancelled before restaurant confirmation

### Example Payment Breakdown
```
Group Order: "Lunch Together"
├── Participant 1 (Creator): $15.00 (Burger + Fries)
├── Participant 2: $12.50 (Pizza slice + Drink) 
├── Participant 3: $8.00 (Salad)
└── Total: $35.50

Each person pays their individual amount.
Restaurant receives one consolidated order worth $35.50.
Food is prepared together and delivered to one location.
```

## 🔄 Status Flow

```
Group Order Lifecycle:
1. "open" → Participants can join and add meals
2. "ready" → All participants have paid, sent to restaurant
3. "confirmed" → Restaurant accepted, food being prepared
4. "completed" → Food delivered successfully
5. "cancelled" → Order cancelled (refunds processed)
```

## 🚨 Error Handling

### Insufficient Balance
```json
{
  "success": false,
  "message": "Insufficient balance. You need 25.50 bytes but have 20.00 bytes."
}
```

### Already Paid
```json
{
  "success": false,
  "message": "You have already paid for this order"
}
```

### Order Closed
```json
{
  "success": false,
  "message": "This group order is no longer accepting payments"
}
```

## 📱 Frontend Integration

### Payment Button Logic
```javascript
const PaymentButton = ({ groupOrder, userPayment }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/advanced-orders/group/${groupOrder._id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        // Update UI to show payment completed
        // If result.data.allPaid, show "Order sent to restaurant"
      } else {
        // Show error message
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userPayment.hasPaid) {
    return <span className="paid-badge">✅ Paid ${userPayment.amount}</span>;
  }

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading || groupOrder.status !== 'open'}
      className="pay-button"
    >
      {loading ? 'Processing...' : `Pay $${userPayment.amount}`}
    </button>
  );
};
```

### Payment Status Display
```javascript
const PaymentStatus = ({ paymentStatus }) => {
  const { yourPayment, groupSummary } = paymentStatus;
  
  return (
    <div className="payment-status">
      <h3>Payment Status</h3>
      
      {/* Your payment */}
      <div className="your-payment">
        <span>Your portion: ${yourPayment.amount}</span>
        <span className={yourPayment.hasPaid ? 'paid' : 'unpaid'}>
          {yourPayment.hasPaid ? '✅ Paid' : '❌ Unpaid'}
        </span>
      </div>
      
      {/* Group progress */}
      <div className="group-progress">
        <span>{groupSummary.paidParticipants}/{groupSummary.totalParticipants} paid</span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(groupSummary.paidParticipants / groupSummary.totalParticipants) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Unpaid participants */}
      {groupSummary.unpaidParticipants.length > 0 && (
        <div className="unpaid-list">
          <h4>Waiting for:</h4>
          {groupSummary.unpaidParticipants.map(p => (
            <div key={p.username}>
              {p.username} - ${p.amount}
            </div>
          ))}
        </div>
      )}
      
      {groupSummary.allPaid && (
        <div className="all-paid-notice">
          🎉 All participants have paid! Order sent to restaurant.
        </div>
      )}
    </div>
  );
};
```

This system ensures that:
✅ Each person pays only for their own food
✅ Money is deducted immediately when they pay
✅ Restaurant gets the order only when everyone has paid
✅ Food is prepared and delivered together
✅ Proper refund handling if orders are cancelled
