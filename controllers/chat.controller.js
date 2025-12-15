const Chat = require('../models/Chat');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ChatAPI = require('../api/ChatAPI');

/**
 * INTEGRATED CHAT CONTROLLER - Tối ưu hóa và gọn gàng
 */

// Core response logic - Tích hợp tất cả vào một function với bóng chat gợi ý
const getAutoResponse = async (userMessage, userId) => {
  const message = userMessage.toLowerCase();
  
  try {
    // Kiểm tra sản phẩm không bán
    if (isNonClothingProduct(message)) {
      const suggestions = await getProductSuggestions();
      const chatSuggestions = await generateSmartSuggestions(message, 'product_info');
      return {
        response: `Xin lỗi, shop chúng tôi chỉ bán áo nam. Chúng tôi không bán loại sản phẩm này.\n\n💡 **Gợi ý tìm kiếm:**\n${suggestions}`,
        responseType: 'product_info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }
    
    // Tìm kiếm sản phẩm
    if (isProductSearch(message)) {
      // Kiểm tra xem loại áo có trong database không
      const categoryCheck = await checkCategoryAvailability(message);
      
      if (categoryCheck.notAvailable) {
        // Loại áo không có trong database
        const chatSuggestions = await generateSmartSuggestions(message, 'product_info');
        return {
          response: `❌ **Thông báo:** Hiện tại cửa hàng chúng tôi chưa nhập loại ${categoryCheck.requestedCategory}.\n\n💡 **Các loại áo có sẵn:**\n${categoryCheck.availableCategories}\n\n🆘 **Liên hệ hỗ trợ:**\n• Hotline: 1900-1234\n• Email: support@manzone.com\n• Chat với nhân viên để được tư vấn thêm`,
          responseType: 'product_info',
          suggestions: createInteractiveSuggestions(chatSuggestions)
        };
      }
      
      const products = await searchProducts(message);
      const chatSuggestions = await generateSmartSuggestions(message, 'product_list', products);
      
      if (products.length > 0) {
        return {
          response: formatProductList(products, message),
          responseType: 'product_list',
          suggestions: createInteractiveSuggestions(chatSuggestions)
        };
      } else {
        return {
          response: `Không tìm thấy sản phẩm nào phù hợp với "${message}".\n\n💡 **Gợi ý:** Thử với từ khóa đơn giản hơn như: áo sơ mi, trắng, size M`,
          responseType: 'product_info',
          suggestions: createInteractiveSuggestions(chatSuggestions)
        };
      }
    }
    
    // Lời chào
    if (isGreeting(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'greeting');
      return {
        response: await getGreetingMessage(),
        responseType: 'greeting',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }
    
    // Yêu cầu giúp đỡ
    if (isHelpRequest(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'help');
      return {
        response: await getHelpMessage(),
        responseType: 'help',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }
    
    // Tìm kiếm thông tin
    if (isInfoRequest(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: await getInfoResponse(message),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    // Xử lý các câu hỏi cụ thể
    if (isShippingFeeQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getShippingFeeInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    if (isDeliveryTimeQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getDeliveryTimeInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    if (isOpeningHoursQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getOpeningHoursInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    if (isReturnPolicyQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getReturnPolicyInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    if (isSizeConsultationQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getSizeConsultationInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    if (isTrackOrderQuestion(message)) {
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: getTrackOrderInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    // Xử lý tư vấn size dựa trên chiều cao và cân nặng
    if (isSizeAdviceRequest(message)) {
      const sizeAdvice = getSizeAdviceFromHeightWeight(message);
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: sizeAdvice,
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }

    // Xử lý theo dõi đơn hàng
    if (isOrderTrackingRequest(message)) {
      const orderTracking = getOrderTrackingResponse(message);
      const chatSuggestions = await generateSmartSuggestions(message, 'info');
      return {
        response: orderTracking,
        responseType: 'info',
        suggestions: createInteractiveSuggestions(chatSuggestions)
      };
    }
    
    // Phản hồi mặc định
    const chatSuggestions = await generateSmartSuggestions(message, 'default');
    return {
      response: await getDefaultResponse(),
      responseType: 'default',
      suggestions: createInteractiveSuggestions(chatSuggestions)
    };
    
  } catch (error) {
    console.error('Error in getAutoResponse:', error);
    return {
      response: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
      responseType: 'default',
      suggestions: createInteractiveSuggestions([
        'Tìm sản phẩm',
        'Hướng dẫn mua',
        'Liên hệ hỗ trợ',
        'Về trang chủ',
        'Thử lại'
      ])
    };
  }
};

// Helper functions - Tối ưu hóa
const isNonClothingProduct = (message) => {
  const nonClothingWords = ['quần', 'pants', 'jeans', 'váy', 'dress', 'giày', 'shoes', 'túi', 'bag', 'mũ', 'hat', 'khăn', 'scarf'];
  return nonClothingWords.some(word => message.includes(word));
};

const isGreeting = (message) => {
  const greetings = ['chào', 'hello', 'hi', 'xin chào', 'hey'];
  return greetings.some(word => message.includes(word));
};

const isHelpRequest = (message) => {
  const helpWords = ['giúp', 'help', 'hướng dẫn', 'làm sao', 'cách'];
  return helpWords.some(word => message.includes(word));
};

const isProductSearch = (message) => {
  const productWords = ['áo', 'shirt', 'tìm', 'search', 'có', 'mua', 'bán'];
  return productWords.some(word => message.includes(word));
};

const isInfoRequest = (message) => {
  const infoWords = ['giá', 'price', 'size', 'kích thước', 'giao hàng', 'ship', 'thanh toán', 'payment'];
  return infoWords.some(word => message.includes(word));
};

// Kiểm tra các câu hỏi cụ thể
const isShippingFeeQuestion = (message) => {
  const shippingFeeWords = ['phí ship', 'phí giao hàng', 'tiền ship', 'tiền giao hàng', 'ship bao nhiêu', 'giao hàng bao nhiêu'];
  return shippingFeeWords.some(word => message.includes(word));
};

const isDeliveryTimeQuestion = (message) => {
  const deliveryTimeWords = ['giao hàng bao lâu', 'ship bao lâu', 'thời gian giao hàng', 'bao lâu thì nhận được', 'khi nào nhận được'];
  return deliveryTimeWords.some(word => message.includes(word));
};

const isOpeningHoursQuestion = (message) => {
  const openingHoursWords = ['giờ mở cửa', 'mở cửa lúc mấy giờ', 'cửa hàng mở cửa', 'giờ làm việc', 'mấy giờ mở cửa'];
  return openingHoursWords.some(word => message.includes(word));
};

const isReturnPolicyQuestion = (message) => {
  const returnPolicyWords = ['chính sách đổi trả', 'đổi trả', 'trả hàng', 'hoàn tiền', 'đổi size', 'đổi màu'];
  return returnPolicyWords.some(word => message.includes(word));
};

const isSizeConsultationQuestion = (message) => {
  const sizeConsultationWords = ['tư vấn size', 'size nào phù hợp', 'chọn size', 'size gì phù hợp', 'size nào đẹp'];
  return sizeConsultationWords.some(word => message.includes(word));
};

const isTrackOrderQuestion = (message) => {
  const trackOrderWords = ['theo dõi đơn hàng', 'trạng thái đơn hàng', 'đơn hàng của tôi', 'kiểm tra đơn hàng', 'đơn hàng đến đâu'];
  return trackOrderWords.some(word => message.includes(word));
};

// Kiểm tra yêu cầu tư vấn size dựa trên chiều cao và cân nặng
const isSizeAdviceRequest = (message) => {
  const heightWeightPattern = /(\d+)\s*(?:cm|centimet|centimeter).*?(\d+)\s*(?:kg|kilo|kilogram)/i;
  return heightWeightPattern.test(message);
};

// Kiểm tra yêu cầu theo dõi đơn hàng
const isOrderTrackingRequest = (message) => {
  const orderCodePattern = /(?:mã|ma|code|đơn hàng|order)\s*(?:là|la|:)?\s*([A-Z]{2}\d+)/i;
  return orderCodePattern.test(message);
};

// Kiểm tra xem loại áo có trong database không
const checkCategoryAvailability = async (message) => {
  try {
    // Lấy tất cả categories từ database
    const categories = await Category.find({}).select('name');
    const availableCategories = categories.map(cat => cat.name);
    
    // Tìm kiếm các từ khóa về loại áo trong tin nhắn
    const clothingKeywords = ['áo sơ mi', 'áo thun', 'áo khoác', 'áo vest', 'áo hoodie', 'áo dạ', 'áo len', 'áo cardigan', 'áo blazer', 'áo bomber', 'áo denim', 'áo flannel', 'áo henley', 'áo turtleneck', 'áo polo'];
    
    for (const keyword of clothingKeywords) {
      if (message.includes(keyword)) {
        // Kiểm tra xem loại áo này có trong database không
        const isAvailable = availableCategories.some(cat => 
          cat.toLowerCase().includes(keyword.replace('áo ', '').toLowerCase()) ||
          keyword.toLowerCase().includes(cat.toLowerCase())
        );
        
        if (!isAvailable) {
          // Loại áo không có trong database
          const availableList = availableCategories.slice(0, 5).map(cat => `• ${cat}`).join('\n');
          return {
            notAvailable: true,
            requestedCategory: keyword,
            availableCategories: availableList,
            message: `Hiện tại cửa hàng chúng tôi chưa nhập loại ${keyword}.`
          };
        }
      }
    }
    
    // Tất cả loại áo được yêu cầu đều có sẵn
    return {
      notAvailable: false,
      requestedCategory: null,
      availableCategories: null,
      message: null
    };
    
  } catch (error) {
    console.error('Error checking category availability:', error);
    // Nếu có lỗi, giả sử tất cả đều có sẵn
    return {
      notAvailable: false,
      requestedCategory: null,
      availableCategories: null,
      message: null
    };
  }
};

// Database operations - Tối ưu hóa
const getProductSuggestions = async () => {
  try {
    const categories = await Category.find({}).limit(5);
    return categories.map(cat => `• ${cat.name}`).join('\n') || '• Áo sơ mi, áo thun, áo khoác\n• Áo vest, áo hoodie';
  } catch (error) {
    return '• Áo sơ mi, áo thun, áo khoác\n• Áo vest, áo hoodie';
  }
};

// Tạo bóng chat gợi ý thông minh và tương tác - Lấy động từ database
const generateSmartSuggestions = async (message, responseType, products = []) => {
  try {
    // Lấy categories từ database để tạo gợi ý động
    const categories = await Category.find({}).select('name').limit(8);
    const categoryNames = categories.map(cat => cat.name);
    
    const baseSuggestions = {
      greeting: [
        ...categoryNames.slice(0, 3).map(cat => `Tìm ${cat}`),
        'Xem giá cả',
        'Hướng dẫn mua'
      ],
      help: [
        ...categoryNames.slice(0, 3).map(cat => `Tìm ${cat}`),
        'Xem bảng size',
        'Hỏi giao hàng'
      ],
      info: [
        'Tìm sản phẩm',
        'Xem danh mục',
        'Hướng dẫn mua',
        'Liên hệ hỗ trợ',
        'Về trang chủ'
      ],
      default: [
        ...categoryNames.slice(0, 3).map(cat => `Tìm ${cat}`),
        'Xem giá cả',
        'Hướng dẫn mua',
        'Phí ship bao nhiêu?',
        'Giao hàng bao lâu?',
        'Giờ mở cửa?',
        'Chính sách đổi trả?',
        'Tư vấn size',
        'Theo dõi đơn hàng',
        'Liên hệ'
      ]
    };

    // Gợi ý dựa trên sản phẩm tìm thấy
    if (responseType === 'product_list' && products.length > 0) {
      const productSuggestions = [
        'Tìm áo khác',
        'Xem size',
        'Xem giá',
        'Hỏi giao hàng',
        'Hỏi thanh toán'
      ];
      
      // Thêm gợi ý cụ thể dựa trên sản phẩm
      if (products.some(p => p.category?.name)) {
        const foundCategories = [...new Set(products.map(p => p.category.name))];
        foundCategories.slice(0, 2).forEach(cat => {
          productSuggestions.push(`Xem thêm ${cat}`);
        });
      }
      
      if (products.some(p => p.price <= 200000)) {
        productSuggestions.push('Xem áo giá rẻ');
      }
      
      return productSuggestions.slice(0, 5);
    }

    // Gợi ý dựa trên từ khóa trong tin nhắn
    for (const category of categoryNames) {
      if (message.includes(category.toLowerCase())) {
        const otherCategories = categoryNames.filter(c => c !== category).slice(0, 2);
        return [
          ...otherCategories.map(cat => `Tìm ${cat}`),
          `Xem giá ${category}`,
          'Hỏi size',
          'Hỏi giao hàng'
        ];
      }
    }
    
    if (message.includes('giá')) {
      return ['Tìm áo giá rẻ', 'Tìm áo cao cấp', 'Xem bảng giá', 'Hỏi khuyến mãi', 'Hỏi thanh toán'];
    }
    if (message.includes('size')) {
      return ['Tìm áo size S', 'Tìm áo size M', 'Tìm áo size L', 'Xem bảng size', 'Hỏi tư vấn'];
    }

    return baseSuggestions[responseType] || baseSuggestions.default;
    
  } catch (error) {
    console.error('Error generating smart suggestions:', error);
    
    // Fallback to generic suggestions if database fails
    const fallbackSuggestions = {
      greeting: ['Tìm sản phẩm', 'Xem giá cả', 'Hướng dẫn mua', 'Liên hệ hỗ trợ', 'Xem danh mục'],
      help: ['Tìm sản phẩm', 'Xem bảng size', 'Hỏi giao hàng', 'Hỏi thanh toán', 'Xem danh mục'],
      info: ['Tìm sản phẩm', 'Xem danh mục', 'Hướng dẫn mua', 'Liên hệ hỗ trợ', 'Về trang chủ'],
      default: ['Tìm sản phẩm', 'Xem giá cả', 'Hướng dẫn mua', 'Liên hệ hỗ trợ', 'Xem danh mục']
    };
    
    return fallbackSuggestions[responseType] || fallbackSuggestions.default;
  }
};

// Tạo bóng chat gợi ý tương tác với emoji và action
const createInteractiveSuggestions = (suggestions) => {
  return suggestions.map(suggestion => ({
    text: suggestion,
    action: getActionFromSuggestion(suggestion),
    emoji: getEmojiFromSuggestion(suggestion)
  }));
};

// Lấy action từ gợi ý - Hỗ trợ tìm kiếm động
const getActionFromSuggestion = (suggestion) => {
  // Kiểm tra nếu là gợi ý tìm kiếm động (bắt đầu bằng "Tìm ")
  if (suggestion.startsWith('Tìm ')) {
    const categoryName = suggestion.substring(4); // Bỏ "Tìm " ở đầu
    return `search_dynamic:${categoryName}`; // Trả về action với category name
  }
  
  const actionMap = {
    'Xem giá cả': 'view_prices',
    'Hướng dẫn mua': 'view_guide',
    'Liên hệ hỗ trợ': 'contact_support',
    'Xem bảng size': 'view_size_chart',
    'Hỏi giao hàng': 'ask_shipping',
    'Hỏi thanh toán': 'ask_payment',
    'Tìm áo khác': 'search_other',
    'Xem size': 'view_size',
    'Xem giá': 'view_price',
    'Xem danh mục': 'view_categories',
    'Về trang chủ': 'go_home',
    'Thử lại': 'retry',
    'Phí ship bao nhiêu?': 'ask_shipping_fee',
    'Giao hàng bao lâu?': 'ask_delivery_time',
    'Giờ mở cửa?': 'ask_opening_hours',
    'Chính sách đổi trả?': 'ask_return_policy',
    'Tư vấn size': 'ask_size_consultation',
    'Theo dõi đơn hàng': 'track_order',
    'Liên hệ': 'contact_support'
  };
  return actionMap[suggestion] || 'default';
};

// Lấy emoji từ gợi ý
const getEmojiFromSuggestion = (suggestion) => {
  const emojiMap = {
    'Tìm áo sơ mi': '👔',
    'Tìm áo thun': '👕',
    'Tìm áo khoác': '🧥',
    'Xem giá cả': '💰',
    'Hướng dẫn mua': '📖',
    'Liên hệ hỗ trợ': '🆘',
    'Xem bảng size': '📏',
    'Hỏi giao hàng': '🚚',
    'Hỏi thanh toán': '💳',
    'Tìm áo khác': '🔍',
    'Xem size': '📐',
    'Xem giá': '💵',
    'Xem danh mục': '📂',
    'Về trang chủ': '🏠',
    'Thử lại': '🔄',
    'Phí ship bao nhiêu?': '🚚',
    'Giao hàng bao lâu?': '⏰',
    'Giờ mở cửa?': '🕐',
    'Chính sách đổi trả?': '📋',
    'Tư vấn size': '📏',
    'Theo dõi đơn hàng': '📦',
    'Liên hệ': '📞'
  };
  return emojiMap[suggestion] || '💬';
};

// Xử lý action từ bóng chat gợi ý
const handleSuggestionAction = async (action, message = '') => {
  const actionHandlers = {
    // Tìm kiếm động theo category từ database
    'search_by_category': async (categoryName) => {
      const products = await searchProducts(categoryName);
      const suggestions = await generateSmartSuggestions(categoryName, 'product_list', products);
      return {
        response: formatProductList(products, categoryName),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    
    // Tìm kiếm động theo bất kỳ category nào
    'search_dynamic': async (categoryName) => {
      const products = await searchProducts(categoryName);
      const suggestions = await generateSmartSuggestions(categoryName, 'product_list', products);
      return {
        response: formatProductList(products, categoryName),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    'search_ao_so_mi': async () => {
      const products = await searchProducts('áo sơ mi');
      const suggestions = await generateSmartSuggestions('áo sơ mi', 'product_list', products);
      return {
        response: formatProductList(products, 'áo sơ mi'),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    
    'search_ao_thun': async () => {
      const products = await searchProducts('áo thun');
      const suggestions = await generateSmartSuggestions('áo thun', 'product_list', products);
      return {
        response: formatProductList(products, 'áo thun'),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    
    'search_ao_khoac': async () => {
      const products = await searchProducts('áo khoác');
      const suggestions = await generateSmartSuggestions('áo khoác', 'product_list', products);
      return {
        response: formatProductList(products, 'áo khoác'),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    
    'view_prices': async () => {
      return {
        response: await getPriceInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Tìm áo giá rẻ',
          'Tìm áo cao cấp',
          'Xem bảng giá',
          'Hỏi khuyến mãi',
          'Hỏi thanh toán'
        ])
      };
    },
    
    'view_guide': async () => {
      return {
        response: await getHelpMessage(),
        responseType: 'help',
        suggestions: createInteractiveSuggestions([
          'Tìm áo sơ mi',
          'Tìm áo thun',
          'Xem bảng size',
          'Hỏi giao hàng',
          'Hỏi thanh toán',
          'Xem danh mục',
          'Liên hệ hỗ trợ'
        ])
      };
    },
    
    'view_size_chart': async () => {
      return {
        response: getSizeInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Tìm áo size S',
          'Tìm áo size M',
          'Tìm áo size L',
          'Hỏi tư vấn size',
          'Xem sản phẩm'
        ])
      };
    },
    
    'ask_shipping': async () => {
      return {
        response: getShippingInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Tìm sản phẩm',
          'Hỏi thanh toán',
          'Xem giá cả',
          'Liên hệ hỗ trợ',
          'Về trang chủ'
        ])
      };
    },

    'ask_shipping_fee': async () => {
      return {
        response: getShippingFeeInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Hỏi thời gian giao hàng',
          'Hỏi chính sách đổi trả',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ'
        ])
      };
    },

    'ask_delivery_time': async () => {
      return {
        response: getDeliveryTimeInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Hỏi phí ship',
          'Hỏi chính sách đổi trả',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ'
        ])
      };
    },

    'ask_opening_hours': async () => {
      return {
        response: getOpeningHoursInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Hỏi phí ship',
          'Hỏi giao hàng',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ'
        ])
      };
    },

    'ask_return_policy': async () => {
      return {
        response: getReturnPolicyInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Hỏi phí ship',
          'Hỏi giao hàng',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ'
        ])
      };
    },

    'ask_size_consultation': async () => {
      return {
        response: getSizeConsultationInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Nhập chiều cao và cân nặng',
          'Xem bảng size',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ'
        ])
      };
    },

    'track_order': async () => {
      return {
        response: getTrackOrderInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Nhập mã đơn hàng',
          'Tìm sản phẩm',
          'Liên hệ hỗ trợ',
          'Về trang chủ'
        ])
      };
    },
    
    'ask_payment': async () => {
      return {
        response: getPaymentInfo(),
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Tìm sản phẩm',
          'Hỏi giao hàng',
          'Xem giá cả',
          'Liên hệ hỗ trợ',
          'Về trang chủ'
        ])
      };
    },
    
    'search_other': async () => {
      return {
        response: await getDefaultResponse(),
        responseType: 'default',
        suggestions: createInteractiveSuggestions([
          'Tìm áo sơ mi',
          'Tìm áo thun',
          'Tìm áo khoác',
          'Xem danh mục',
          'Hướng dẫn mua'
        ])
      };
    },
    
    // Tìm kiếm động theo category từ database
    'search_by_category': async (categoryName) => {
      const products = await searchProducts(categoryName);
      const suggestions = await generateSmartSuggestions(categoryName, 'product_list', products);
      return {
        response: formatProductList(products, categoryName),
        responseType: 'product_list',
        suggestions: createInteractiveSuggestions(suggestions)
      };
    },
    
    'view_categories': async () => {
      try {
        const categories = await Category.find({}).limit(10);
        const categoryList = categories.map(cat => `• ${cat.name}`).join('\n');
        
        // Tạo suggestions động từ categories trong database
        const dynamicSuggestions = categories.slice(0, 5).map(cat => `Tìm ${cat.name}`);
        
        return {
          response: `📂 **DANH MỤC SẢN PHẨM**\n\n${categoryList}\n\n💡 **Gợi ý:** Click vào bóng chat gợi ý để tìm kiếm sản phẩm theo danh mục.`,
          responseType: 'info',
          suggestions: createInteractiveSuggestions([
            ...dynamicSuggestions,
            'Xem giá cả',
            'Hướng dẫn mua'
          ])
        };
      } catch (error) {
        return {
          response: '📂 **DANH MỤC SẢN PHẨM**\n\n• Áo sơ mi\n• Áo thun\n• Áo khoác\n• Áo vest\n• Áo hoodie\n\n💡 **Gợi ý:** Click vào bóng chat gợi ý để tìm kiếm sản phẩm theo danh mục.',
          responseType: 'info',
          suggestions: createInteractiveSuggestions([
            'Tìm áo sơ mi',
            'Tìm áo thun',
            'Tìm áo khoác',
            'Xem giá cả',
            'Hướng dẫn mua'
          ])
        };
      }
    },
    
    'contact_support': async () => {
      return {
        response: '🆘 **LIÊN HỆ HỖ TRỢ**\n\n📞 **Hotline:** 1900-1234\n📧 **Email:** support@manzone.com\n💬 **Chat:** Đang online\n⏰ **Giờ làm việc:** 8:00 - 22:00 (Thứ 2 - Chủ nhật)\n\n💡 **Gợi ý:** Chúng tôi luôn sẵn sàng hỗ trợ bạn!',
        responseType: 'info',
        suggestions: createInteractiveSuggestions([
          'Tìm sản phẩm',
          'Hướng dẫn mua',
          'Xem giá cả',
          'Về trang chủ',
          'Thử lại'
        ])
      };
    },
    
    'go_home': async () => {
      return {
        response: '🏠 **CHÀO MỪNG VỀ TRANG CHỦ**\n\nChào bạn! Tôi có thể giúp bạn:\n\n🎯 **Tìm kiếm sản phẩm:** Áo sơ mi, áo thun, áo khoác...\n💰 **Xem giá cả:** Thông tin chi tiết về giá\n📏 **Hướng dẫn size:** Bảng size chuẩn\n🚚 **Thông tin giao hàng:** Thời gian và phí ship\n💳 **Phương thức thanh toán:** Nhiều lựa chọn\n\n💡 **Gợi ý:** Hãy cho tôi biết bạn cần gì!',
        responseType: 'greeting',
        suggestions: createInteractiveSuggestions([
          'Tìm áo sơ mi',
          'Tìm áo thun',
          'Xem giá cả',
          'Hướng dẫn mua',
          'Liên hệ hỗ trợ'
        ])
      };
    },
    
    'retry': async () => {
      return {
        response: '🔄 **THỬ LẠI**\n\nTôi hiểu bạn muốn thử lại. Hãy cho tôi biết bạn cần gì cụ thể:\n\n• Tìm kiếm sản phẩm\n• Xem thông tin\n• Hướng dẫn mua hàng\n• Liên hệ hỗ trợ\n\n💡 **Gợi ý:** Hãy nhập tin nhắn mới hoặc click vào bóng chat gợi ý!',
        responseType: 'default',
        suggestions: createInteractiveSuggestions([
          'Tìm áo sơ mi',
          'Tìm áo thun',
          'Xem giá cả',
          'Hướng dẫn mua',
          'Liên hệ hỗ trợ'
        ])
      };
    },
    
    'default': async () => {
      return {
        response: await getDefaultResponse(),
        responseType: 'default',
        suggestions: createInteractiveSuggestions([
          'Tìm áo sơ mi',
          'Tìm áo thun',
          'Xem giá cả',
          'Hướng dẫn mua',
          'Liên hệ hỗ trợ'
        ])
      };
    }
  };
  
  // Xử lý action động (ví dụ: search_dynamic:áo dạ)
  if (action.startsWith('search_dynamic:')) {
    const categoryName = action.split(':')[1];
    return await actionHandlers['search_dynamic'](categoryName);
  }
  
  const handler = actionHandlers[action] || actionHandlers['default'];
  return await handler();
};

const getGreetingMessage = async () => {
  return 'Chào bạn! Tôi có thể giúp bạn tìm kiếm áo nam phù hợp. Bạn cần tìm gì cụ thể?';
};

const getHelpMessage = async () => {
  return `🆘 **HƯỚNG DẪN ĐẶT HÀNG CHI TIẾT**\n\n📋 **BƯỚC 1: TÌM KIẾM SẢN PHẨM**\n• Gõ tên sản phẩm: "áo sơ mi", "áo thun", "áo khoác"\n• Gõ từ khóa: "trắng", "đen", "size M", "giá rẻ"\n• Kết hợp: "áo sơ mi trắng size M"\n\n📋 **BƯỚC 2: XEM CHI TIẾT SẢN PHẨM**\n• Click vào sản phẩm để xem hình ảnh, mô tả\n• Kiểm tra size, màu sắc có sẵn\n• Xem giá cả và khuyến mãi\n\n📋 **BƯỚC 3: CHỌN SIZE VÀ MÀU**\n• Chọn size phù hợp (S, M, L, XL, XXL)\n• Chọn màu sắc yêu thích\n• Kiểm tra số lượng còn lại\n\n📋 **BƯỚC 4: THÊM VÀO GIỎ HÀNG**\n• Click "Thêm vào giỏ hàng"\n• Chọn số lượng muốn mua\n• Kiểm tra tổng tiền\n\n📋 **BƯỚC 5: THANH TOÁN**\n• Vào giỏ hàng để xem lại\n• Chọn địa chỉ giao hàng\n• Chọn phương thức thanh toán\n• Xác nhận đơn hàng\n\n📋 **BƯỚC 6: THEO DÕI ĐƠN HÀNG**\n• Nhận email xác nhận\n• Theo dõi trạng thái giao hàng\n• Nhận hàng và kiểm tra\n\n💡 **LƯU Ý QUAN TRỌNG:**\n• Kiểm tra size trước khi mua\n• Đọc kỹ chính sách đổi trả\n• Lưu số điện thoại để liên hệ\n• Thanh toán an toàn qua cổng chính thức\n\n🆘 **CẦN HỖ TRỢ?**\n• Hotline: 1900-1234\n• Chat với nhân viên\n• Email: support@manzone.com`;
};

// Search operations - Tối ưu hóa
const searchProducts = async (message) => {
  try {
    const keywords = await extractKeywords(message);
    if (keywords.length === 0) return [];
    
    const query = buildSearchQuery(keywords);
    return await Product.find(query).populate('category').limit(10);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Lấy keywords động từ database
const extractKeywords = async (message) => {
  try {
    // Lấy tất cả categories từ database
    const categories = await Category.find({}).select('name');
    const categoryKeywords = categories.map(cat => cat.name.toLowerCase());
    
    const validKeywords = {
      // Loại áo - Lấy động từ database
      ...Object.fromEntries(categoryKeywords.map(cat => [cat, 'category'])),
      
      // Màu sắc
      'trắng': 'color', 'đen': 'color', 'xanh': 'color', 'đỏ': 'color',
      'vàng': 'color', 'hồng': 'color', 'nâu': 'color', 'xám': 'color', 'cam': 'color',
      'xanh dương': 'color', 'xanh lá': 'color', 'tím': 'color', 'hồng đậm': 'color',
      
      // Size
      's': 'size', 'm': 'size', 'l': 'size', 'xl': 'size', 'xxl': 'size',
      'xs': 'size', '2xl': 'size', '3xl': 'size', '4xl': 'size',
      
      // Giá cả
      'giá rẻ': 'price', 'dưới 200k': 'price', 'dưới 500k': 'price', 'trên 500k': 'price',
      'rẻ': 'price', 'đắt': 'price', 'cao cấp': 'price', 'bình dân': 'price'
    };
    
    return Object.entries(validKeywords)
      .filter(([keyword]) => message.includes(keyword))
      .map(([keyword, type]) => ({ keyword, type, value: keyword }));
      
  } catch (error) {
    console.error('Error extracting keywords from database:', error);
    
    // Fallback to hardcoded keywords if database fails
    const fallbackKeywords = {
      'áo sơ mi': 'category', 'áo thun': 'category', 'áo khoác': 'category',
      'áo vest': 'category', 'áo hoodie': 'category',
      'áo dạ': 'category', 'áo len': 'category',
      
      'trắng': 'color', 'đen': 'color', 'xanh': 'color', 'đỏ': 'color',
      's': 'size', 'm': 'size', 'l': 'size', 'xl': 'size', 'xxl': 'size',
      'giá rẻ': 'price', 'dưới 200k': 'price', 'dưới 500k': 'price'
    };
    
    return Object.entries(fallbackKeywords)
      .filter(([keyword]) => message.includes(keyword))
      .map(([keyword, type]) => ({ keyword, type, value: keyword }));
  }
};

const buildSearchQuery = (keywords) => {
  const query = {};
  keywords.forEach(({ type, value }) => {
    switch (type) {
      case 'category': 
        // Tìm kiếm theo category name hoặc category ID
        query.$or = [
          { 'category.name': { $regex: value, $options: 'i' } },
          { category: { $regex: value, $options: 'i' } }
        ];
        break;
      case 'color': query['variations.color'] = { $regex: value, $options: 'i' }; break;
      case 'size': query['variations.size'] = { $regex: value, $options: 'i' }; break;
      case 'price': addPriceFilter(query, value); break;
    }
  });
  return query;
};

const addPriceFilter = (query, priceType) => {
  const priceFilters = {
    'giá rẻ': 200000, 'dưới 200k': 200000,
    'dưới 500k': 500000, 'trên 500k': 500000
  };
  
  if (priceFilters[priceType]) {
    query.price = priceType === 'trên 500k' ? { $gt: priceFilters[priceType] } : { $lte: priceFilters[priceType] };
  }
};

const formatProductList = (products, searchQuery) => {
  if (products.length === 0) {
    return `Không tìm thấy sản phẩm nào phù hợp với "${searchQuery}".\n\n💡 **Gợi ý:** Thử với từ khóa đơn giản hơn như: áo sơ mi, trắng, size M`;
  }

  const productList = products.map((product, index) => {
    let info = `${index + 1}. **${product.name}**\n   💰 Giá: ${formatPrice(product.price)}\n   📂 Danh mục: ${product.category?.name || 'N/A'}`;
    
    if (product.variations?.length > 0) {
      const colors = [...new Set(product.variations.map(v => v.color))];
      const sizes = [...new Set(product.variations.map(v => v.size))];
      
      if (colors.length > 0) info += `\n   🎨 Màu sắc: ${colors.join(', ')}`;
      if (sizes.length > 0) info += `\n   📏 Size: ${sizes.join(', ')}`;
    }
    
    return info + `\n   📦 Số lượng: ${product.quantity}\n`;
  }).join('\n');
  
  return `✅ **Tìm thấy ${products.length} sản phẩm phù hợp:**\n\n${productList}\n💡 **Gợi ý:** Thử tìm kiếm với từ khóa khác hoặc kết hợp nhiều tiêu chí.`;
};

const getInfoResponse = async (message) => {
  const infoMap = {
    'giá': getPriceInfo, 'price': getPriceInfo,
    'size': getSizeInfo, 'kích thước': getSizeInfo,
    'giao hàng': getShippingInfo, 'ship': getShippingInfo,
    'thanh toán': getPaymentInfo, 'payment': getPaymentInfo
  };
  
  for (const [keyword, func] of Object.entries(infoMap)) {
    if (message.includes(keyword)) return await func();
  }
  
  return 'Bạn cần thông tin gì cụ thể? Tôi có thể giúp về giá cả, size, giao hàng, thanh toán...';
};

const getPriceInfo = async () => {
  try {
    const priceRanges = await Product.aggregate([
      { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' }, avgPrice: { $avg: '$price' } } }
    ]);
    
    if (priceRanges.length > 0) {
      const { minPrice, maxPrice, avgPrice } = priceRanges[0];
      return `💰 **THÔNG TIN GIÁ CẢ**\n\n• Giá thấp nhất: ${formatPrice(minPrice)}\n• Giá cao nhất: ${formatPrice(maxPrice)}\n• Giá trung bình: ${formatPrice(Math.round(avgPrice))}\n\n💡 **Gợi ý:** Sử dụng từ khóa "giá rẻ", "dưới 200k", "dưới 500k" để tìm sản phẩm theo giá.`;
    }
    
    return '💰 **THÔNG TIN GIÁ CẢ**\n\n• Áo thun: 200.000 - 500.000 VNĐ\n• Áo sơ mi: 350.000 - 800.000 VNĐ\n• Áo khoác: 500.000 - 1.200.000 VNĐ\n• Áo vest: 800.000 - 2.000.000 VNĐ';
  } catch (error) {
    return '💰 **THÔNG TIN GIÁ CẢ**\n\n• Áo thun: 200.000 - 500.000 VNĐ\n• Áo sơ mi: 350.000 - 800.000 VNĐ\n• Áo khoác: 500.000 - 1.200.000 VNĐ';
  }
};

const getSizeInfo = () => {
  return `📏 **BẢNG SIZE**\n\n• S: 50-55kg (Ngực: 88-92cm)\n• M: 55-65kg (Ngực: 92-96cm)\n• L: 65-75kg (Ngực: 96-100cm)\n• XL: 75-85kg (Ngực: 100-104cm)\n• XXL: 85-95kg (Ngực: 104-108cm)\n\n💡 **Gợi ý:** Sử dụng từ khóa "size S", "size M" để tìm sản phẩm theo size.`;
};

const getShippingInfo = () => {
  return `🚚 **THÔNG TIN GIAO HÀNG**\n\n• Nội thành HCM/HN: 1-2 ngày\n• Ngoại thành: 2-3 ngày\n• Tỉnh thành khác: 3-5 ngày\n• Vùng xa: 5-7 ngày\n\n💰 **Phí ship:** 30.000 VNĐ (Miễn phí cho đơn từ 500.000 VNĐ)`;
};

const getPaymentInfo = () => {
  return `💳 **PHƯƠNG THỨC THANH TOÁN**\n\n• 💵 Tiền mặt khi nhận hàng (COD)\n• 🏦 Chuyển khoản ngân hàng\n• 📱 Ví điện tử MoMo\n• 💳 Thẻ tín dụng/ghi nợ\n• 🎫 Ví ShopeePay, ZaloPay`;
};

const getDefaultResponse = async () => {
  try {
    const categories = await Category.find({}).limit(3);
    const categoryList = categories.map(cat => `• ${cat.name}`).join('\n');
    return `Cảm ơn bạn đã liên hệ! Tôi có thể giúp bạn:\n\n🎯 **Tìm kiếm sản phẩm:**\n${categoryList}\n\n💡 **Thông tin khác:** Giá cả, size, giao hàng, thanh toán\n\nHãy cho tôi biết bạn cần gì cụ thể!`;
  } catch (error) {
    return 'Cảm ơn bạn đã liên hệ! Tôi có thể giúp bạn tìm kiếm áo nam, tư vấn size, giải đáp về giá cả... Hãy cho tôi biết bạn cần gì!';
  }
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

// Get chat history
const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const chat = await Chat.findOne({ 
      user_id: userId, 
      session_id: sessionId 
    }).populate('user_id', 'full_name email');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    const recentMessages = chat.getRecentMessages(100);
    
    res.json({
      success: true,
      data: {
        sessionId: chat.session_id,
        messages: recentMessages,
        totalMessages: chat.total_messages,
        lastActivity: chat.last_activity,
        status: chat.status
      }
    });
    
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Send message - Tối ưu hóa
const sendMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    // Validate input using ChatAPI
    ChatAPI.validateChatSession(sessionId, userId);
    const validatedMessage = ChatAPI.validateMessage(message);
    
    const chat = await Chat.findOrCreateSession(userId, sessionId);
    const userMessage = chat.addMessage(validatedMessage, true);
    await chat.save();

    const isAdminChat = sessionId.includes('admin_');
    
    // Emit user message to socket
    const io = req.app.get('io');
    if (io) {
      // Check if this is an admin chat session
      if (isAdminChat) {
        const adminRoomName = `admin_${sessionId.split('_').pop()}`;
        console.log('📱 Emitting newUserMessage to admin room:', adminRoomName);
        io.to(adminRoomName).emit('newUserMessage', {
          sessionId,
          userId,
          text: userMessage.text,
          timestamp: userMessage.timestamp,
          messageId: userMessage.message_id
        });
        
        // Emit confirmation to user for admin chat
        io.to(`user_${userId}`).emit('messageSent', {
          sessionId,
          messageId: userMessage.message_id
        });
      } else {
        // This is a bot chat session - emit user message and generate bot response
        console.log('🤖 Bot chat session detected, emitting user message to socket');
        io.to(`user_${userId}`).emit('newMessage', {
          sessionId, 
          message: { 
            message_id: userMessage.message_id, 
            text: userMessage.text, 
            is_user: true, 
            timestamp: userMessage.timestamp 
          }
        });
        
        // Generate bot response for non-admin chats
        console.log('🤖 Generating bot response for message:', validatedMessage);
        const { response, responseType } = await getAutoResponse(validatedMessage, userId);
        console.log('🤖 Bot response generated:', { response: response.substring(0, 100) + '...', responseType });
        
        // Add bot response after delay (simulate typing)
        setTimeout(async () => {
          try {
            console.log('🤖 Adding bot response to chat after delay');
            const updatedChat = await Chat.findOne({ user_id: userId, session_id: sessionId });
            if (updatedChat) {
              const botMessage = updatedChat.addMessage(response, false, responseType);
              await updatedChat.save();
              console.log('🤖 Bot message saved to database:', botMessage.message_id);
              
              if (io) {
                console.log('🤖 Emitting bot response to socket for user:', userId);
                console.log('🤖 Target room:', `user_${userId}`);
                console.log('🤖 Bot message data:', {
                  sessionId, 
                  message: { 
                    message_id: botMessage.message_id, 
                    text: botMessage.text.substring(0, 100) + '...', 
                    is_user: false, 
                    timestamp: botMessage.timestamp, 
                    response_type: botMessage.response_type 
                  }
                });
                
                // Check if room exists and has users
                const room = io.sockets.adapter.rooms.get(`user_${userId}`);
                console.log('🤖 Users in room user_' + userId + ':', room ? room.size : 0);
                
                // Emit to specific bot chat room first
                const botRoomName = `bot_${sessionId.split('_').pop()}`;
                io.to(botRoomName).emit('newMessage', {
                  sessionId, 
                  message: { 
                    message_id: botMessage.message_id, 
                    text: botMessage.text, 
                    is_user: false, 
                    timestamp: botMessage.timestamp, 
                    response_type: botMessage.response_type 
                  }
                });
                
                // Also emit to user's personal room for fallback compatibility
                io.to(`user_${userId}`).emit('newMessage', {
                  sessionId, 
                  message: { 
                    message_id: botMessage.message_id, 
                    text: botMessage.text, 
                    is_user: false, 
                    timestamp: botMessage.timestamp, 
                    response_type: botMessage.response_type 
                  }
                });
                console.log('🤖 Bot response emitted successfully to both bot room and user room');
              }
            } else {
              console.log('❌ Could not find updated chat for bot response');
            }
          } catch (error) {
            console.error('Error saving bot response:', error);
          }
        }, 1000 + Math.random() * 2000);
      }
    }
    
    res.json(
      ChatAPI.formatSuccessResponse({
        message: ChatAPI.formatChatMessage(userMessage)
      })
    );
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json(
      ChatAPI.formatErrorResponse(error)
    );
  }
};

// Get user's chat sessions - Tối ưu hóa
const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const sessions = await Chat.find({ user_id: userId })
      .select('session_id last_activity total_messages status messages')
      .sort({ last_activity: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const sessionsWithLastMessage = sessions.map(session => {
      const lastMessage = session.messages[session.messages.length - 1];
      return {
        session_id: session.session_id,
        last_activity: session.last_activity,
        total_messages: session.total_messages,
        status: session.status,
        last_message: lastMessage ? {
          text: lastMessage.text.substring(0, 100) + (lastMessage.text.length > 100 ? '...' : ''),
          is_user: lastMessage.is_user,
          timestamp: lastMessage.timestamp
        } : null
      };
    });
    
    const total = await Chat.countDocuments({ user_id: userId });
    
    res.json({
      success: true,
      data: {
        sessions: sessionsWithLastMessage,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_sessions: total,
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new chat session
const createChatSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = `session_${userId}_${Date.now()}`;
    
    const chat = await Chat.findOrCreateSession(userId, sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId: chat.session_id,
        messages: chat.getRecentMessages(50),
        created_at: chat.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Close chat session
const closeChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const chat = await Chat.findOne({ 
      user_id: userId, 
      session_id: sessionId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    chat.status = 'closed';
    await chat.save();
    
    res.json({
      success: true,
      message: 'Chat session closed successfully'
    });
    
  } catch (error) {
    console.error('Error closing chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin Chat Methods - Tối ưu hóa

// Get all admin chats (for admin staff)
const getAllAdminChats = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const query = status !== 'all' ? { status } : {};
    
    const sessions = await Chat.find({
      ...query,
      session_id: { $regex: /^admin_/ },
    })
      .populate('user_id', 'full_name email phone')
      .select('session_id last_activity total_messages status user_id messages')
      .sort({ last_activity: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Has session: ', sessions.length);
    
    const sessionsWithLastMessage = sessions.map(session => {
      const lastMessage = session.messages[session.messages.length - 1];
      return {
        session_id: session.session_id,
        last_activity: session.last_activity,
        total_messages: session.total_messages,
        status: session.status,
        user: {
          id: session.user_id._id,
          full_name: session.user_id.full_name,
          email: session.user_id.email,
          phone: session.user_id.phone
        },
        last_message: lastMessage ? {
          text: lastMessage.text.substring(0, 100) + (lastMessage.text.length > 100 ? '...' : ''),
          is_user: lastMessage.is_user,
          timestamp: lastMessage.timestamp
        } : null
      };
    });
    
    const total = await Chat.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        sessions: sessionsWithLastMessage,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_sessions: total,
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error getting all admin chats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get admin chat history for a specific session
const getAdminChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const chat = await Chat.findOne({ session_id: sessionId })
      .populate('user_id', 'full_name email phone');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    const recentMessages = chat.getRecentMessages(100);
    
    res.json({
      success: true,
      data: {
        sessionId: chat.session_id,
        user: {
          id: chat.user_id._id,
          full_name: chat.user_id.full_name,
          email: chat.user_id.email,
          phone: chat.user_id.phone
        },
        messages: recentMessages,
        totalMessages: chat.total_messages,
        lastActivity: chat.last_activity,
        status: chat.status
      }
    });
    
  } catch (error) {
    console.error('Error getting admin chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Send admin response to user
const sendAdminResponse = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const adminId = req.user.id;
    
    // Validate input using ChatAPI
    const validatedMessage = ChatAPI.validateMessage(message);
    
    const chat = await Chat.findOne({ session_id: sessionId });
    
    if (!chat) {
      return res.status(404).json(
        ChatAPI.formatErrorResponse(null, 'Chat session not found')
      );
    }
    
    // Add admin message
    const adminMessage = chat.addMessage(validatedMessage, false, 'admin_response');
    adminMessage.admin_id = adminId;
    
    await chat.save();
    
    // Emit to socket if available
    const io = req.app.get('io');
    if (io) {
      // Emit to user
      io.to(`user_${chat.user_id}`).emit('newAdminMessage', {
        sessionId: sessionId,
        message: {
          message_id: adminMessage.message_id,
          text: adminMessage.text,
          is_user: false,
          timestamp: adminMessage.timestamp,
          response_type: 'admin_response',
          admin_id: adminId
        }
      });
      
      // Also emit to admin chat room for real-time updates
      if (sessionId.includes('admin_')) {
        const adminRoomName = `admin_${sessionId.split('_').pop()}`;
        io.to(adminRoomName).emit('newAdminMessage', {
          sessionId,
          text: adminMessage.text,
          timestamp: adminMessage.timestamp,
          adminId
        });
      }
    }
    
    res.json(
      ChatAPI.formatSuccessResponse({
        message: ChatAPI.formatChatMessage(adminMessage)
      })
    );
    
  } catch (error) {
    console.error('Error sending admin response:', error);
    res.status(500).json(
      ChatAPI.formatErrorResponse(error)
    );
  }
};

// Create admin chat session (for admin to initiate chat with user)
const createAdminChatSession = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if there's an existing active session
    let existingChat = await Chat.findOne({ 
      user_id: userId, 
      status: 'active' 
    });
    
    if (existingChat) {
      // Return existing session
      const recentMessages = existingChat.getRecentMessages(50);
      
      return res.json({
        success: true,
        data: {
          sessionId: existingChat.session_id,
          messages: recentMessages,
          created_at: existingChat.created_at,
          isExisting: true
        }
      });
    }
    
    // Create new session
    const sessionId = `admin_${userId}`;
    const chat = await Chat.findOrCreateSession(userId, sessionId, 'admin');
    
    res.json({
      success: true,
      data: {
        sessionId: chat.session_id,
        messages: chat.getRecentMessages(50),
        created_at: chat.created_at,
        isExisting: false
      }
    });
    
  } catch (error) {
    console.error('Error creating admin chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Xử lý khi click vào bóng chat gợi ý
const handleSuggestionClick = async (req, res) => {
  try {
    const { action, sessionId } = req.body;
    const userId = req.user.id;
    
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required' });
    }
    
    // Xử lý action từ suggestion
    const result = await handleSuggestionAction(action);
    
    // Lưu tin nhắn bot vào chat session nếu có sessionId
    if (sessionId) {
      try {
        const chat = await Chat.findOne({ user_id: userId, session_id: sessionId });
        if (chat) {
          chat.addMessage(result.response, false, result.responseType);
          await chat.save();
        }
      } catch (error) {
        console.warn('Warning: Could not save suggestion response to chat session:', error.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        response: result.response,
        responseType: result.responseType,
        suggestions: result.suggestions
      }
    });
    
  } catch (error) {
    console.error('Error handling suggestion click:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      suggestions: createInteractiveSuggestions([
        'Tìm sản phẩm',
        'Hướng dẫn mua',
        'Liên hệ hỗ trợ',
        'Về trang chủ',
        'Thử lại'
      ])
    });
  }
};

// ========================================
// THÔNG TIN CHI TIẾT - Fix cứng các câu trả lời
// ========================================

// Thông tin phí ship
const getShippingFeeInfo = () => {
  return `🚚 **THÔNG TIN PHÍ SHIP**\n\n💰 **Phí ship nội thành Hà Nội:**\n• Đơn hàng < 500k: 30k\n• Đơn hàng 500k - 1M: 20k\n• Đơn hàng > 1M: MIỄN PHÍ\n\n💰 **Phí ship tỉnh lân cận:**\n• Đơn hàng < 500k: 50k\n• Đơn hàng 500k - 1M: 40k\n• Đơn hàng > 1M: 30k\n\n💰 **Phí ship toàn quốc:**\n• Đơn hàng < 500k: 80k\n• Đơn hàng 500k - 1M: 60k\n• Đơn hàng > 1M: 50k\n\n💡 **Lưu ý:**\n• Áp dụng cho đơn hàng giao hàng tiêu chuẩn\n• Giao hàng nhanh: +20k\n• Giao hàng trong ngày: +50k`;
};

// Thông tin thời gian giao hàng
const getDeliveryTimeInfo = () => {
  return `⏰ **THÔNG TIN THỜI GIAN GIAO HÀNG**\n\n🚚 **Giao hàng tiêu chuẩn:**\n• Nội thành Hà Nội: 1-2 ngày làm việc\n• Tỉnh lân cận: 2-3 ngày làm việc\n• Toàn quốc: 3-7 ngày làm việc\n\n⚡ **Giao hàng nhanh:**\n• Nội thành Hà Nội: Trong ngày\n• Tỉnh lân cận: 1-2 ngày\n• Toàn quốc: 2-3 ngày\n\n📅 **Thời gian giao hàng:**\n• Thứ 2 - Thứ 6: 8:00 - 20:00\n• Thứ 7: 8:00 - 18:00\n• Chủ nhật: 9:00 - 17:00\n\n💡 **Lưu ý:**\n• Không giao hàng vào ngày lễ, tết\n• Thời gian có thể thay đổi do thời tiết, giao thông`;
};

// Thông tin giờ mở cửa
const getOpeningHoursInfo = () => {
  return `🕐 **GIỜ MỞ CỬA CỬA HÀNG**\n\n🏪 **Cửa hàng trực tiếp:**\n• Thứ 2 - Thứ 6: 8:00 - 22:00\n• Thứ 7: 8:00 - 21:00\n• Chủ nhật: 9:00 - 20:00\n\n💻 **Website & App:**\n• Hoạt động 24/7\n• Đặt hàng bất cứ lúc nào\n• Hỗ trợ online: 8:00 - 22:00\n\n📞 **Hotline hỗ trợ:**\n• Thứ 2 - Thứ 6: 8:00 - 22:00\n• Thứ 7: 8:00 - 21:00\n• Chủ nhật: 9:00 - 20:00\n\n💡 **Lưu ý:**\n• Giờ mở cửa có thể thay đổi vào ngày lễ, tết\n• Website luôn mở cửa để đặt hàng online`;
};

// Thông tin chính sách đổi trả
const getReturnPolicyInfo = () => {
  return `📋 **CHÍNH SÁCH ĐỔI TRẢ**\n\n✅ **Điều kiện đổi trả:**\n• Sản phẩm còn nguyên vẹn, chưa sử dụng\n• Còn tem mác, bao bì gốc\n• Trong vòng 30 ngày kể từ ngày mua\n• Có hóa đơn mua hàng\n\n🔄 **Quy trình đổi trả:**\n• Liên hệ hotline: 1900-1234\n• Gửi ảnh sản phẩm qua email\n• Nhân viên xác nhận và hướng dẫn\n• Gửi sản phẩm về cửa hàng\n• Kiểm tra và xử lý trong 3-5 ngày\n\n❌ **Không được đổi trả:**\n• Sản phẩm đã sử dụng, giặt\n• Sản phẩm bị hỏng do người dùng\n• Sản phẩm sale, khuyến mãi\n• Sản phẩm đã cắt may theo yêu cầu\n\n💡 **Lưu ý:**\n• Phí ship đổi trả: Khách hàng chịu\n• Thời gian xử lý: 3-5 ngày làm việc`;
};

// Thông tin tư vấn size
const getSizeConsultationInfo = () => {
  return `📏 **TƯ VẤN SIZE ÁO**\n\n📝 **Hướng dẫn đo size:**\n• **Chiều cao:** Đo từ đỉnh đầu đến gót chân\n• **Cân nặng:** Cân trọng lượng cơ thể\n• **Vòng ngực:** Đo vòng ngực rộng nhất\n• **Vòng eo:** Đo vòng eo nhỏ nhất\n• **Vòng mông:** Đo vòng mông rộng nhất\n\n💡 **Nhập thông tin để được tư vấn:**\nVí dụ: "Tôi cao 170cm, nặng 65kg"\nHoặc: "Chiều cao 175cm, cân nặng 70kg"\n\n📊 **Bảng size tham khảo:**\n• **Size S:** 160-170cm, 50-60kg\n• **Size M:** 165-175cm, 55-70kg\n• **Size L:** 170-180cm, 65-80kg\n• **Size XL:** 175-185cm, 75-90kg\n• **Size XXL:** 180-190cm, 85-100kg\n\n🆘 **Cần hỗ trợ?** Liên hệ hotline: 1900-1234`;
};

// Thông tin theo dõi đơn hàng
const getTrackOrderInfo = () => {
  return `📦 **THEO DÕI ĐƠN HÀNG**\n\n🔍 **Cách theo dõi:**\n• Nhập mã đơn hàng (VD: MD001, MD002...)\n• Hoặc nhập số điện thoại đặt hàng\n• Hệ thống sẽ hiển thị trạng thái chi tiết\n\n📊 **Trạng thái đơn hàng:**\n• **Đã đặt hàng:** Đơn hàng đã được xác nhận\n• **Đang xử lý:** Đang chuẩn bị hàng\n• **Đang giao hàng:** Đang vận chuyển\n• **Đã giao hàng:** Hoàn thành giao hàng\n• **Đã hủy:** Đơn hàng bị hủy\n\n💡 **Nhập mã đơn hàng:**\nVí dụ: "Mã đơn hàng MD001"\nHoặc: "Theo dõi MD002"\n\n🆘 **Không tìm thấy?** Liên hệ hotline: 1900-1234`;
};

// Tư vấn size dựa trên chiều cao và cân nặng
const getSizeAdviceFromHeightWeight = (message) => {
  try {
    // Tìm chiều cao và cân nặng trong tin nhắn
    const heightMatch = message.match(/(\d+)\s*(?:cm|centimet|centimeter)/i);
    const weightMatch = message.match(/(\d+)\s*(?:kg|kilo|kilogram)/i);
    
    if (!heightMatch || !weightMatch) {
      return `📏 **TƯ VẤN SIZE**\n\n❌ **Không thể đọc được thông tin:**\nVui lòng nhập theo định dạng:\n"Tôi cao 170cm, nặng 65kg"\nHoặc: "Chiều cao 175cm, cân nặng 70kg"\n\n💡 **Gợi ý:** Hãy nhập chính xác chiều cao (cm) và cân nặng (kg)`;
    }
    
    const height = parseInt(heightMatch[1]);
    const weight = parseInt(weightMatch[1]);
    
    // Tính BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    // Xác định size dựa trên BMI và chiều cao
    let recommendedSize = '';
    let sizeDescription = '';
    
    if (height < 160) {
      if (bmi < 18.5) recommendedSize = 'S';
      else if (bmi < 25) recommendedSize = 'S-M';
      else recommendedSize = 'M';
      sizeDescription = 'Size nhỏ, phù hợp với người có vóc dáng nhỏ gọn';
    } else if (height < 170) {
      if (bmi < 18.5) recommendedSize = 'S-M';
      else if (bmi < 25) recommendedSize = 'M';
      else recommendedSize = 'M-L';
      sizeDescription = 'Size trung bình, phù hợp với đa số người Việt Nam';
    } else if (height < 180) {
      if (bmi < 18.5) recommendedSize = 'M';
      else if (bmi < 25) recommendedSize = 'L';
      else recommendedSize = 'L-XL';
      sizeDescription = 'Size lớn, phù hợp với người cao và có vóc dáng đầy đặn';
    } else {
      if (bmi < 18.5) recommendedSize = 'L';
      else if (bmi < 25) recommendedSize = 'XL';
      else recommendedSize = 'XL-XXL';
      sizeDescription = 'Size rất lớn, phù hợp với người cao và có vóc dáng to';
    }
    
    // Phân tích BMI
    let bmiStatus = '';
    if (bmi < 18.5) bmiStatus = 'Thiếu cân';
    else if (bmi < 25) bmiStatus = 'Bình thường';
    else if (bmi < 30) bmiStatus = 'Thừa cân';
    else bmiStatus = 'Béo phì';
    
    return `📏 **TƯ VẤN SIZE CHI TIẾT**\n\n📊 **Thông tin của bạn:**\n• **Chiều cao:** ${height}cm\n• **Cân nặng:** ${weight}kg\n• **BMI:** ${bmi.toFixed(1)} (${bmiStatus})\n\n👔 **Size khuyến nghị:** ${recommendedSize}\n\n💡 **Giải thích:**\n${sizeDescription}\n\n📋 **Bảng size tham khảo:**\n• **Size S:** 160-170cm, 50-60kg\n• **Size M:** 165-175cm, 55-70kg\n• **Size L:** 170-180cm, 65-80kg\n• **Size XL:** 175-185cm, 75-90kg\n• **Size XXL:** 180-190cm, 85-100kg\n\n⚠️ **Lưu ý:**\n• Đây chỉ là gợi ý, bạn nên thử trực tiếp để chắc chắn\n• Mỗi thương hiệu có thể có size khác nhau\n• Nên đo vòng ngực để chọn size chính xác hơn\n\n🆘 **Cần hỗ trợ?** Liên hệ hotline: 1900-1234`;
    
  } catch (error) {
    console.error('Error in getSizeAdviceFromHeightWeight:', error);
    return `📏 **TƯ VẤN SIZE**\n\n❌ **Có lỗi xảy ra:**\nVui lòng nhập lại thông tin theo định dạng:\n"Tôi cao 170cm, nặng 65kg"\n\n💡 **Gợi ý:** Hãy nhập chính xác chiều cao (cm) và cân nặng (kg)`;
  }
};

// Xử lý theo dõi đơn hàng
const getOrderTrackingResponse = (message) => {
  try {
    // Tìm mã đơn hàng trong tin nhắn
    const orderCodeMatch = message.match(/(?:mã|ma|code|đơn hàng|order)\s*(?:là|la|:)?\s*([A-Z]{2}\d+)/i);
    
    if (!orderCodeMatch) {
      return `📦 **THEO DÕI ĐƠN HÀNG**\n\n❌ **Không tìm thấy mã đơn hàng:**\nVui lòng nhập theo định dạng:\n"Mã đơn hàng MD001"\nHoặc: "Theo dõi MD002"\n\n💡 **Gợi ý:** Mã đơn hàng thường có dạng MD001, MD002...`;
    }
    
    const orderCode = orderCodeMatch[1];
    
    // Giả lập trạng thái đơn hàng (trong thực tế sẽ query database)
    const mockOrderStatuses = {
      'MD001': { status: 'Đang giao hàng', location: 'Trung tâm phân phối Hà Nội', estimatedDelivery: '2-3 ngày tới' },
      'MD002': { status: 'Đã giao hàng', location: 'Đã hoàn thành', estimatedDelivery: 'Đã giao thành công' },
      'MD003': { status: 'Đang xử lý', location: 'Kho hàng', estimatedDelivery: '3-5 ngày tới' },
      'MD004': { status: 'Đã đặt hàng', location: 'Chờ xác nhận', estimatedDelivery: '1-2 ngày tới' }
    };
    
    const orderInfo = mockOrderStatuses[orderCode];
    
    if (orderInfo) {
      return `📦 **THEO DÕI ĐƠN HÀNG ${orderCode}**\n\n✅ **Trạng thái:** ${orderInfo.status}\n📍 **Vị trí:** ${orderInfo.location}\n⏰ **Dự kiến:** ${orderInfo.estimatedDelivery}\n\n📊 **Chi tiết trạng thái:**\n• **Đã đặt hàng:** Đơn hàng đã được xác nhận\n• **Đang xử lý:** Đang chuẩn bị hàng\n• **Đang giao hàng:** Đang vận chuyển\n• **Đã giao hàng:** Hoàn thành giao hàng\n\n💡 **Gợi ý:** Nếu cần hỗ trợ thêm, hãy liên hệ hotline: 1900-1234`;
    } else {
      return `📦 **THEO DÕI ĐƠN HÀNG ${orderCode}**\n\n❌ **Không tìm thấy đơn hàng:**\nMã đơn hàng ${orderCode} không tồn tại trong hệ thống\n\n💡 **Gợi ý:**\n• Kiểm tra lại mã đơn hàng\n• Liên hệ hotline: 1900-1234 để được hỗ trợ\n• Hoặc nhập mã đơn hàng khác`;
    }
    
  } catch (error) {
    console.error('Error in getOrderTrackingResponse:', error);
    return `📦 **THEO DÕI ĐƠN HÀNG**\n\n❌ **Có lỗi xảy ra:**\nVui lòng nhập lại mã đơn hàng theo định dạng:\n"Mã đơn hàng MD001"\n\n💡 **Gợi ý:** Mã đơn hàng thường có dạng MD001, MD002...`;
  }
};

// Create user admin chat session (for users to connect with admin)
const createUserAdminChatSession = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Validate input using ChatAPI
    ChatAPI.validateChatSession(userId, userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(
        ChatAPI.formatErrorResponse(null, 'User not found')
      );
    }
    
    // Check if there's an existing active admin chat session
    let existingChat = await Chat.findOne({ 
      user_id: userId, 
      type: 'admin',
      status: 'active' 
    });
    
    if (existingChat) {
      // Close existing session but keep history in database
      existingChat.status = 'closed';
      existingChat.closed_at = new Date();
      await existingChat.save();
      
      console.log(`📱 Closed existing admin chat session: ${existingChat.session_id}`);
      
      // Optionally, we could return the previous session's messages here
      // But for now, we'll start fresh as requested
    }
    
    // Create new admin chat session using ChatAPI
    const sessionId = ChatAPI.generateSessionId('admin', userId);
    console.log(`📱 Generating session ID: ${sessionId}`);
    
    const chat = await Chat.findOrCreateSession(userId, sessionId, 'admin');
    console.log(`📱 Chat session created/found:`, {
      sessionId: chat.session_id,
      type: chat.type,
      messagesCount: chat.messages ? chat.messages.length : 0,
      messages: chat.messages ? chat.messages.map(m => ({ id: m.message_id, text: m.text.substring(0, 30) })) : []
    });
    
    // Get the actual messages from the chat session
    const actualMessages = chat.messages || [];
    
    console.log(`📱 Created admin chat session: ${sessionId}, messages count: ${actualMessages.length}`);
    
    // Emit WebSocket event to notify admin about new chat session
    const io = req.app.get('io');
    if (io) {
      console.log('🆕 Emitting newAdminChatSession to admin_room');
      io.to('admin_room').emit('newAdminChatSession', {
        sessionId: chat.session_id,
        userId: userId,
        userName: user.name || user.email,
        lastMessage: actualMessages.length > 0 ? actualMessages[actualMessages.length - 1].text : 'New chat session',
        timestamp: new Date()
      });
    }
    
    const formattedMessages = actualMessages.map(msg => ChatAPI.formatChatMessage(msg));
    
    console.log(`📱 Returning response with ${formattedMessages.length} messages:`, {
      sessionId: chat.session_id,
      messageCount: formattedMessages.length,
      messages: formattedMessages.map(m => ({ id: m.message_id, text: m.text.substring(0, 50), is_user: m.is_user }))
    });
    
    res.json(
      ChatAPI.formatSuccessResponse({
        sessionId: chat.session_id,
        messages: formattedMessages, // Return actual messages
        created_at: chat.created_at,
        isExisting: false,
        previousSessionClosed: existingChat ? existingChat.session_id : null
      })
    );
    
  } catch (error) {
    console.error('Error creating user admin chat session:', error);
    res.status(500).json(
      ChatAPI.formatErrorResponse(error)
    );
  }
};

// Send admin chat message - Function for admin chat without bot responses
const sendAdminChatMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    // Validate input using ChatAPI
    ChatAPI.validateChatSession(sessionId, userId);
    const validatedMessage = ChatAPI.validateMessage(message);
    
      // Check if this is an admin chat session
      if (!sessionId.includes('admin_')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin chat session'
        });
      }
    
    const chat = await Chat.findOrCreateSession(userId, sessionId);
    const userMessage = chat.addMessage(validatedMessage, true);
    await chat.save();
    
    // Emit user message to socket for admin
    const io = req.app.get('io');
    if (io) {
      const adminRoomName = `admin_${sessionId.split('_').pop()}`;
      console.log('📱 Emitting newUserMessage to admin room:', adminRoomName);
      io.to(adminRoomName).emit('newUserMessage', {
        sessionId,
        userId,
        text: userMessage.text,
        timestamp: userMessage.timestamp,
        messageId: userMessage.message_id
      });
      
      // Emit confirmation to user
      io.to(`user_${userId}`).emit('messageSent', {
        sessionId,
        messageId: userMessage.message_id
      });
    }
    
    res.json(
      ChatAPI.formatSuccessResponse({
        message: ChatAPI.formatChatMessage(userMessage)
      })
    );
  } catch (error) {
    console.error('Error sending admin chat message:', error);
    res.status(500).json(
      ChatAPI.formatErrorResponse(error)
    );
  }
};

// Get admin chat history for user (all sessions)
const getUserAdminChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all admin chat sessions for this user (including closed ones)
    const allSessions = await Chat.find({ 
      user_id: userId, 
      type: 'admin'
    }).sort({ created_at: -1 });
    
    const sessionsWithHistory = allSessions.map(session => {
      const messages = session.getRecentMessages(100); // Get more messages for history
      return {
        session_id: session.session_id,
        status: session.status,
        created_at: session.created_at,
        closed_at: session.closed_at,
        total_messages: session.total_messages,
        messages: messages.map(ChatAPI.formatChatMessage)
      };
    });
    
    res.json(
      ChatAPI.formatSuccessResponse({
        sessions: sessionsWithHistory,
        total_sessions: sessionsWithHistory.length
      })
    );
    
  } catch (error) {
    console.error('Error getting user admin chat history:', error);
    res.status(500).json(
      ChatAPI.formatErrorResponse(error)
    );
  }
};

// ========================================
// EXPORTS - Tích hợp tất cả chức năng
// ========================================

module.exports = {
  // Core chat logic
  getAutoResponse,
  
  // User chat methods
  getChatHistory,
  sendMessage,
  getChatSessions,
  createChatSession,
  closeChatSession,
  
  // Admin chat methods
  getAllAdminChats,
  getAdminChatHistory,
  sendAdminResponse,
  createAdminChatSession,
  createUserAdminChatSession,
  
  // Suggestion handling
  handleSuggestionClick,
  
  // Helper functions for suggestions
  generateSmartSuggestions,
  createInteractiveSuggestions,
  getActionFromSuggestion,
  getEmojiFromSuggestion,
  handleSuggestionAction,
  
  // Search and keyword functions
  extractKeywords,
  searchProducts,
  
  // Helper message functions
  getHelpMessage,
  
  // Product suggestion functions
  getProductSuggestions,
  
  // Category availability check
  checkCategoryAvailability,
  
  // New detailed info functions
  getShippingFeeInfo,
  getDeliveryTimeInfo,
  getOpeningHoursInfo,
  getReturnPolicyInfo,
  getSizeConsultationInfo,
  getTrackOrderInfo,
  getSizeAdviceFromHeightWeight,
  getOrderTrackingResponse,
  
  // Admin chat methods
  sendAdminChatMessage,
  getUserAdminChatHistory
};
