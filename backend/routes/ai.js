const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Standardized System Prompt for BiteSwift AI Assistant
const SYSTEM_PROMPT = `You are the BiteSwift AI Support Assistant, a helpful and intelligent virtual agent for BiteSwift, a premium food delivery service. 
You have real-time access to the user's profile and database systems through tools.

CRITICAL INSTRUCTIONS:
1. Always check the user's active orders or profile first before replying to questions about their orders, balance, or subscription status.
2. If the user asks to cancel an order, use the cancel_my_order tool. Explain that cancellations are only allowed before food preparation starts (i.e., when status is 'placed' or 'confirmed').
3. If the user asks for food recommendations, use the search_dishes tool. Suggest specific items and mention their restaurant and price.
4. If the user wants to subscribe to Gold membership, explain the benefits (free delivery, priority support, exclusive deals) and ask if they would like you to activate it. If they say yes, use the activate_gold_membership tool.
5. Be polite, concise, and helpful. Use markdown (e.g. bold **text**, bullet points) to format your answers nicely.
6. The current date and time is ${new Date().toLocaleString()}.
`;

// Tool schema definitions for OpenRouter / OpenAI API
const tools = [
    {
        type: "function",
        function: {
            name: "get_my_profile",
            description: "Get the current customer's profile details including name, email, wallet balance, loyalty points, achievements, and whether they are a gold subscriber."
        }
    },
    {
        type: "function",
        function: {
            name: "get_my_orders",
            description: "Get a list of all current and past orders placed by the current user, including order IDs, statuses, restaurant names, list of items with their names and quantities, and billing details."
        }
    },
    {
        type: "function",
        function: {
            name: "cancel_my_order",
            description: "Cancel an active order by providing its order ID. An order can only be cancelled if its status is 'placed' or 'confirmed'. On cancellation, the full order amount will be refunded to the user's wallet.",
            parameters: {
                type: "object",
                properties: {
                    orderId: {
                        type: "string",
                        description: "The unique MongoDB ID of the active order to cancel."
                    }
                },
                required: ["orderId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_dishes",
            description: "Search for dishes (menu items) across all restaurants in the system. Filter by query keywords, maximum price, category (Mains, Starters, Desserts, Drinks), or tags (e.g. Spicy, Vegan, Halal).",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "A search keyword for the food name or description."
                    },
                    maxPrice: {
                        type: "number",
                        description: "Maximum price of the menu items."
                    },
                    category: {
                        type: "string",
                        description: "Food category. One of: 'Starters', 'Mains', 'Desserts', 'Drinks'."
                    },
                    tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of tags, e.g. ['Spicy', 'Vegan', 'Halal', 'Healthy']."
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_restaurants",
            description: "Get the list of all available restaurants in the system along with their ratings, cuisines, price ranges, minimum orders, and current statuses."
        }
    },
    {
        type: "function",
        function: {
            name: "activate_gold_membership",
            description: "Instantly activate BiteSwift Gold membership for the user. Gold subscription gives free delivery, priority customer support, and exclusive deals. Deducts $9.99 subscription fee from wallet balance."
        }
    }
];

// @route   POST api/ai/search
// @desc    AI Smart Search (Parses prompt to search items)
// @access  Public
router.post('/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ msg: 'No query provided' });

    try {
        const items = await MenuItem.find().populate('restaurant');
        const searchStr = query.toLowerCase();

        // 1. Parse constraints
        let maxPrice = null;
        const priceRegex = /under\s*\$?\s*(\d+(\.\d+)?)/i;
        const matchPrice = searchStr.match(priceRegex);
        if (matchPrice) {
            maxPrice = parseFloat(matchPrice[1]);
        }

        const isSpicy = searchStr.includes('spicy') || searchStr.includes('hot') || searchStr.includes('chili');
        const isHealthy = searchStr.includes('healthy') || searchStr.includes('diet') || searchStr.includes('low calorie');
        const isVegan = searchStr.includes('vegan') || searchStr.includes('vegetarian');
        const isHalal = searchStr.includes('halal');
        const isSweet = searchStr.includes('sweet') || searchStr.includes('dessert') || searchStr.includes('cake') || searchStr.includes('sugar');
        const isDrink = searchStr.includes('drink') || searchStr.includes('beverage') || searchStr.includes('shake') || searchStr.includes('soda');

        // 2. Filter logic
        const results = items.filter(it => {
            // Price Filter
            if (maxPrice !== null && it.price > maxPrice) return false;

            // Strict tags or descriptive matches
            let matches = false;

            if (isSpicy && (it.tags.includes('Spicy') || it.description.toLowerCase().includes('spicy') || it.name.toLowerCase().includes('spicy') || it.description.toLowerCase().includes('chili'))) {
                matches = true;
            }
            if (isVegan && (it.tags.includes('Vegan') || it.tags.includes('Vegetarian') || it.description.toLowerCase().includes('vegan') || it.description.toLowerCase().includes('vegetarian'))) {
                matches = true;
            }
            if (isHalal && (it.tags.includes('Halal') || it.description.toLowerCase().includes('halal'))) {
                matches = true;
            }
            if (isHealthy && (it.calories < 400 || it.tags.includes('Healthy') || it.description.toLowerCase().includes('healthy') || it.description.toLowerCase().includes('salad'))) {
                matches = true;
            }
            if (isSweet && (it.category === 'Desserts' || it.tags.includes('Dessert') || it.description.toLowerCase().includes('sweet') || it.name.toLowerCase().includes('chocolate'))) {
                matches = true;
            }
            if (isDrink && (it.category === 'Drinks' || it.description.toLowerCase().includes('drink') || it.name.toLowerCase().includes('milkshake') || it.name.toLowerCase().includes('soda'))) {
                matches = true;
            }

            // Keyword match fallback
            if (!isSpicy && !isVegan && !isHalal && !isHealthy && !isSweet && !isDrink) {
                const keywords = searchStr.split(' ');
                const matchesKeyword = keywords.some(kw => 
                    kw.length > 2 && (
                        it.name.toLowerCase().includes(kw) || 
                        it.description.toLowerCase().includes(kw) ||
                        (it.restaurant && it.restaurant.name.toLowerCase().includes(kw))
                    )
                );
                if (matchesKeyword) matches = true;
            }

            return matches;
        });

        res.json(results.slice(0, 8)); // Return top 8 matches
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/ai/support-chat
// @desc    AI Customer Support Agent (Real-time SSE with tool calling)
// @access  Private
router.post('/support-chat', auth, async (req, res) => {
    const { message, history } = req.body;
    if (!message && (!history || history.length === 0)) {
        return res.status(400).json({ msg: 'Empty message' });
    }

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send SSE messages
    const sendSSE = (type, content) => {
        res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
    };

    if (!process.env.OPENROUTER_API_KEY) {
        // Fallback to offline mock simulation
        sendSSE('status', 'Offline Simulation Mode (API Key Missing)');
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const user = await User.findById(req.user.id);
            const orders = await Order.find({ customer: req.user.id })
                .populate('restaurant')
                .populate('items.menuItem')
                .sort({ createdAt: -1 });

            const activeOrder = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
            const text = message.toLowerCase();

            let reply = '';
            if (text.includes('cancel') || text.includes('refund')) {
                if (!activeOrder) {
                    reply = "I couldn't find any active orders to cancel. If you are referring to a past order that has already been delivered, please note that delivered orders are not eligible for automated cancellations. Let me know if you want to request help with a specific refund.";
                } else if (activeOrder.status === 'placed' || activeOrder.status === 'confirmed') {
                    activeOrder.status = 'cancelled';
                    await activeOrder.save();
                    user.walletBalance = Math.round((user.walletBalance + activeOrder.total) * 100) / 100;
                    if (!user.achievements.includes('Refund Handled')) {
                        user.achievements.push('Refund Handled');
                    }
                    await user.save();
                    reply = `Understood. I have successfully cancelled your active order from **${activeOrder.restaurant?.name}** (ID: ${activeOrder._id}). A full refund of **$${activeOrder.total.toFixed(2)}** has been credited to your BiteSwift Wallet. Your new balance is **$${user.walletBalance.toFixed(2)}**.`;
                } else {
                    reply = `Your order from **${activeOrder.restaurant?.name}** is already in the **${activeOrder.status}** stage. Since the kitchen has already started preparing your food, we cannot process an automated cancellation at this time. Please contact the restaurant directly.`;
                }
            } else if (text.includes('where is my order') || text.includes('track') || text.includes('status')) {
                if (activeOrder) {
                    reply = `Your order from **${activeOrder.restaurant?.name}** is currently **${activeOrder.status.replace('_', ' ')}**. Our driver is coordinating delivery, and estimated arrival is within the hour. You can view the Live Driver Tracking Map in the 'My Orders' tab!`;
                } else if (orders.length > 0) {
                    const lastOrder = orders[0];
                    reply = `You don't have any active orders right now. Your last order was from **${lastOrder.restaurant?.name}** on ${new Date(lastOrder.createdAt).toLocaleDateString()}, and its status is **${lastOrder.status}**.`;
                } else {
                    reply = "You haven't placed any orders yet. Once you place an order, I can help you track its real-time delivery status!";
                }
            } else if (text.includes('gold') || text.includes('subscription') || text.includes('membership')) {
                reply = `BiteSwift Gold gives you **Free Delivery** on all participating restaurants, priority customer support, and exclusive deals. You can activate it instantly on your Profile tab!`;
            } else {
                reply = `Hello ${user.name}! I am your BiteSwift AI Assistant. 

I can help you:
- **Track Order:** Ask *"Where is my order?"*
- **Cancel Order:** Ask *"Cancel my active order"* (allowed before food preparation starts)
- **Refund Inquiries:** Ask about refund processing.
- **Recommendations:** Ask *"Suggest healthy meals under $12"*

How can I help you today?`;
            }

            const words = reply.split(' ');
            for (const word of words) {
                sendSSE('text', word + ' ');
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            sendSSE('done');
            res.end();
        } catch (err) {
            console.error(err);
            sendSSE('text', 'An error occurred during local simulation processing.');
            sendSSE('done');
            res.end();
        }
        return;
    }

    try {
        const userId = req.user.id;
        const currentModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

        // Get user details
        const user = await User.findById(userId).select('-password');
        const systemPromptContent = `${SYSTEM_PROMPT}\nAuthenticated User Context:\nName: ${user.name}\nEmail: ${user.email}\nWallet Balance: $${user.walletBalance.toFixed(2)}\nGold Member: ${user.isGoldSubscriber ? 'Yes' : 'No'}\nAchievements: ${user.achievements.join(', ')}`;

        // Convert conversation history
        let conversationHistory = [];
        conversationHistory.push({ role: 'system', content: systemPromptContent });

        if (history && Array.isArray(history) && history.length > 0) {
            history.forEach(m => {
                if (m.sender === 'user') {
                    conversationHistory.push({ role: 'user', content: m.text });
                } else if (m.sender === 'ai') {
                    conversationHistory.push({ role: 'assistant', content: m.text });
                }
            });
            // Append current message if not yet present in history
            const lastMsg = conversationHistory[conversationHistory.length - 1];
            if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
                conversationHistory.push({ role: 'user', content: message });
            }
        } else {
            conversationHistory.push({ role: 'user', content: message });
        }

        let toolExecutionLoops = 0;
        let requiresStreamingText = true;

        while (toolExecutionLoops < 5) {
            toolExecutionLoops++;

            // Call OpenRouter with stream: false to detect tools
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "BiteSwift"
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: conversationHistory,
                    tools: tools,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("OpenRouter tool loop request failed:", errText);
                sendSSE('text', `Error: OpenRouter request failed with status ${response.status}.`);
                sendSSE('done');
                res.end();
                return;
            }

            const data = await response.json();
            const messageObj = data.choices?.[0]?.message;

            if (!messageObj) {
                sendSSE('text', 'Error: Received empty response from OpenRouter.');
                sendSSE('done');
                res.end();
                return;
            }

            // If there are tool calls, execute them
            if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
                // Add the assistant's message with tool calls to history
                conversationHistory.push({
                    role: 'assistant',
                    content: messageObj.content || null,
                    tool_calls: messageObj.tool_calls
                });

                for (const toolCall of messageObj.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolCallId = toolCall.id;
                    let toolArgs = {};
                    
                    try {
                        toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                    } catch (e) {
                        console.error("Failed to parse tool arguments:", e);
                    }

                    // Send status update to client
                    sendSSE('status', `Accessing ${toolName.replace(/_/g, ' ')}...`);

                    let toolResult;
                    try {
                        if (toolName === 'get_my_profile') {
                            const u = await User.findById(userId).select('-password');
                            toolResult = u;
                        } else if (toolName === 'get_my_orders') {
                            const orders = await Order.find({ customer: userId })
                                .populate('restaurant')
                                .populate('items.menuItem')
                                .sort({ createdAt: -1 });
                            toolResult = orders;
                        } else if (toolName === 'cancel_my_order') {
                            const order = await Order.findById(toolArgs.orderId).populate('restaurant');
                            if (!order) {
                                toolResult = { error: "Order not found." };
                            } else if (order.customer.toString() !== userId) {
                                toolResult = { error: "Access denied. This is not your order." };
                            } else if (order.status !== 'placed' && order.status !== 'confirmed') {
                                toolResult = { error: `Order is already in the '${order.status}' stage and cannot be cancelled automatically. Please contact the kitchen at ${order.restaurant?.name}.` };
                            } else {
                                order.status = 'cancelled';
                                await order.save();
                                const u = await User.findById(userId);
                                u.walletBalance = Math.round((u.walletBalance + order.total) * 100) / 100;
                                if (!u.achievements.includes('Refund Handled')) {
                                    u.achievements.push('Refund Handled');
                                }
                                await u.save();
                                toolResult = {
                                    success: true,
                                    message: `Order ${toolArgs.orderId} has been successfully cancelled. A refund of $${order.total.toFixed(2)} was credited to your wallet. Your new wallet balance is $${u.walletBalance.toFixed(2)}.`
                                };
                            }
                        } else if (toolName === 'search_dishes') {
                            const { query, maxPrice, category, tags } = toolArgs;
                            let filter = {};
                            if (maxPrice) filter.price = { $lte: maxPrice };
                            if (category) filter.category = category;
                            if (tags && tags.length > 0) filter.tags = { $in: tags };

                            let items = await MenuItem.find(filter).populate('restaurant');
                            if (query) {
                                const q = query.toLowerCase();
                                items = items.filter(it => 
                                    it.name.toLowerCase().includes(q) || 
                                    it.description.toLowerCase().includes(q) ||
                                    (it.restaurant && it.restaurant.name.toLowerCase().includes(q))
                                );
                            }
                            toolResult = items.slice(0, 8).map(it => ({
                                id: it._id,
                                name: it.name,
                                description: it.description,
                                price: it.price,
                                category: it.category,
                                calories: it.calories,
                                tags: it.tags,
                                restaurant: it.restaurant ? it.restaurant.name : 'Unknown Restaurant',
                                available: it.available
                            }));
                        } else if (toolName === 'get_restaurants') {
                            const restaurants = await Restaurant.find();
                            toolResult = restaurants.map(r => ({
                                id: r._id,
                                name: r.name,
                                cuisine: r.cuisine,
                                rating: r.rating,
                                deliveryFee: r.deliveryFee,
                                minimumOrder: r.minimumOrder,
                                isOpen: r.isOpen
                            }));
                        } else if (toolName === 'activate_gold_membership') {
                            const u = await User.findById(userId);
                            if (u.isGoldSubscriber) {
                                toolResult = { message: "You are already a BiteSwift Gold subscriber!" };
                            } else {
                                const fee = 9.99;
                                if (u.walletBalance < fee) {
                                    toolResult = { error: `Insufficient wallet balance. You need at least $${fee} to subscribe, but your current balance is $${u.walletBalance.toFixed(2)}. Please top up first.` };
                                } else {
                                    u.walletBalance = Math.round((u.walletBalance - fee) * 100) / 100;
                                    u.isGoldSubscriber = true;
                                    if (!u.achievements.includes('BiteSwift Gold')) {
                                        u.achievements.push('BiteSwift Gold');
                                    }
                                    await u.save();
                                    toolResult = {
                                        success: true,
                                        message: `Congratulations! You have successfully subscribed to BiteSwift Gold. $${fee} was deducted from your wallet. Your new wallet balance is $${u.walletBalance.toFixed(2)}.`
                                    };
                                }
                            }
                        } else {
                            toolResult = { error: `Tool ${toolName} is not implemented.` };
                        }
                    } catch (toolErr) {
                        console.error(`Error executing tool ${toolName}:`, toolErr);
                        toolResult = { error: `Failed to execute tool due to a backend error: ${toolErr.message}` };
                    }

                    // Append tool result to history
                    conversationHistory.push({
                        role: 'tool',
                        tool_call_id: toolCallId,
                        name: toolName,
                        content: JSON.stringify(toolResult)
                    });
                }
            } else {
                // No tool calls, we can proceed to stream final text
                requiresStreamingText = true;
                break;
            }
        }

        if (requiresStreamingText) {
            // Call OpenRouter with stream: true
            const streamResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "BiteSwift"
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: conversationHistory,
                    stream: true,
                    max_tokens: 1000
                })
            });

            if (!streamResponse.ok) {
                const errText = await streamResponse.text();
                console.error("OpenRouter streaming completions request failed:", errText);
                sendSSE('text', `Error: Streaming request failed with status ${streamResponse.status}.`);
                sendSSE('done');
                res.end();
                return;
            }

            let buffer = '';
            for await (const chunk of streamResponse.body) {
                buffer += new TextDecoder().decode(chunk);
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const cleaned = line.trim();
                    if (!cleaned) continue;
                    if (cleaned === 'data: [DONE]') {
                        break;
                    }
                    if (cleaned.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(cleaned.slice(6));
                            const text = parsed.choices?.[0]?.delta?.content || '';
                            if (text) {
                                sendSSE('text', text);
                            }
                        } catch (err) {
                            // Suppress partial JSON parsing errors
                        }
                    }
                }
            }
        }

        sendSSE('done');
        res.end();
    } catch (err) {
        console.error("OpenRouter support-chat endpoint caught error:", err);
        sendSSE('text', 'An unexpected server error occurred while processing your message.');
        sendSSE('done');
        res.end();
    }
});

// @route   POST api/ai/summarize-reviews
// @desc    AI Restaurant review summarizer (real LLM review summaries)
// @access  Public
router.post('/summarize-reviews', async (req, res) => {
    const { rating, name } = req.body;
    const rate = parseFloat(rating) || 4.5;

    if (!process.env.OPENROUTER_API_KEY) {
        // Fallback simulation
        let summary = `Customers generally enjoy ordering from ${name || 'this restaurant'}. Common points include standard packaging, traditional preparation, and helpful staff.`;
        if (rate >= 4.7) {
            summary = `🌟 **Highly Recommended:** Reviews for **${name || 'this establishment'}** are overwhelmingly positive. Customers frequently praise the exceptionally rich flavors, premium ingredient quality, and blazing fast delivery speeds. Highly recommended local favorite!`;
        } else if (rate >= 4.4) {
            summary = `👍 **Solid Choice:** Customers praise the great portion sizes and authentic taste. A few reviewers noted slight delivery delays during peak dinner hours, but the food quality is considered top-notch.`;
        } else if (rate < 4.0) {
            summary = `⚠️ **Mixed Reviews:** Reviewers mention decent flavor profiles, but raise frequent concerns regarding incorrect orders, cold food deliveries, and inconsistent seasoning. Order with caution during busy hours.`;
        }
        return res.json({ summary });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "BiteSwift"
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an AI reviews specialist for BiteSwift, a premium food delivery service. Write a professional, highly descriptive, and engaging 2-3 sentence review summary of customer reviews based on the rating and restaurant name. Use an appropriate starting emoji (e.g. 🌟 for highly rated, 👍 for solid, ⚠️ for mixed/low ratings). Bold key qualities or highlights. Keep it concise.' 
                    },
                    { 
                        role: 'user', 
                        content: `Please generate a review summary for restaurant "${name}" which currently holds a rating of ${rate} out of 5.0.` 
                    }
                ],
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter returned status ${response.status}`);
        }

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content?.trim() || 'No summary available.';
        res.json({ summary });
    } catch (err) {
        console.error("OpenRouter summarize-reviews failed, using fallback:", err);
        // Fallback
        let summary = `Customers generally enjoy ordering from ${name || 'this restaurant'}. Common points include standard packaging, traditional preparation, and helpful staff.`;
        if (rate >= 4.7) {
            summary = `🌟 **Highly Recommended:** Reviews for **${name || 'this establishment'}** are overwhelmingly positive. Customers frequently praise the exceptionally rich flavors, premium ingredient quality, and blazing fast delivery speeds. Highly recommended local favorite!`;
        } else if (rate >= 4.4) {
            summary = `👍 **Solid Choice:** Customers praise the great portion sizes and authentic taste. A few reviewers noted slight delivery delays during peak dinner hours, but the food quality is considered top-notch.`;
        } else if (rate < 4.0) {
            summary = `⚠️ **Mixed Reviews:** Reviewers mention decent flavor profiles, but raise frequent concerns regarding incorrect orders, cold food deliveries, and inconsistent seasoning. Order with caution during busy hours.`;
        }
        res.json({ summary });
    }
});

module.exports = router;
