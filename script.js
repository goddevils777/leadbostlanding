// Accordion functionality
function toggleAccordion(element) {
    const content = element.nextElementSibling;
    const item = element.parentElement;
    const icon = element.querySelector('.accordion-icon');
    
    // Close all other accordions
    document.querySelectorAll('.accordion-item').forEach(otherItem => {
        if (otherItem !== item) {
            otherItem.classList.remove('active');
            otherItem.querySelector('.accordion-content').classList.remove('active');
            otherItem.querySelector('.accordion-icon').textContent = '+';
        }
    });
    
    // Toggle current accordion
    item.classList.toggle('active');
    content.classList.toggle('active');
    
    // Change icon
    if (item.classList.contains('active')) {
        icon.textContent = '−';
    } else {
        icon.textContent = '+';
    }
}

// Send message to Telegram via PHP backend
async function sendToTelegram(name, contact, message) {
    try {
        // Отправляем на наш PHP backend
        const response = await fetch('./telegram-sender.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                contact: contact,
                message: message
            })
        });

        const result = await response.json();
        
        if (result.success) {
            return { success: true, message: 'Заявка успешно отправлена!' };
        } else {
            throw new Error(result.message || 'Ошибка отправки');
        }
    } catch (error) {
        console.error('Backend error:', error);
        return { 
            success: false, 
            message: 'Ошибка соединения с сервером: ' + error.message
        };
    }
}

// Telegram username validation
function validateTelegramUsername(username) {
    // Remove @ if present
    const cleanUsername = username.replace('@', '');
    
    // Telegram username rules:
    // - 5-32 characters
    // - Only letters, digits and underscores
    // - Must start with a letter
    // - Cannot end with underscore
    // - Cannot have consecutive underscores
    
    const telegramRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;
    
    return telegramRegex.test(cleanUsername);
}

// Form submission handling
async function handleFormSubmission() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const name = formData.get('name').trim();
            const contact = formData.get('contact').trim();
            const message = formData.get('message').trim();
            
            // Basic validation
            if (!name || !contact) {
                showNotification('Пожалуйста, заполните обязательные поля: Имя и Telegram', 'error');
                return;
            }

            // Validate name (minimum 2 characters, only letters and spaces)
            if (name.length < 2 || !/^[а-яёА-ЯЁa-zA-Z\s]+$/.test(name)) {
                showNotification('Пожалуйста, введите корректное имя (только буквы)', 'error');
                return;
            }

            // Validate Telegram username
            if (!validateTelegramUsername(contact)) {
                showNotification('Пожалуйста, введите корректный Telegram username (например: @username или username)', 'error');
                return;
            }
            
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.textContent = 'Отправляется...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            
            try {
                // Send to Telegram via backend
                const result = await sendToTelegram(name, contact, message);
                
                if (result.success) {
                    // Show success message
                    submitBtn.textContent = '✅ Заявка отправлена!';
                    submitBtn.style.background = '#10b981';
                    submitBtn.style.borderColor = '#10b981';
                    submitBtn.style.color = 'white';
                    
                    // Reset form
                    form.reset();
                    
                    // Show success notification
                    showNotification('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в Telegram в ближайшее время.', 'success');
                    
                } else {
                    throw new Error(result.message);
                }
                
            } catch (error) {
                console.error('Form submission error:', error);
                
                // Show error message
                submitBtn.textContent = '❌ Ошибка отправки';
                submitBtn.style.background = '#ef4444';
                submitBtn.style.borderColor = '#ef4444';
                submitBtn.style.color = 'white';
                
                showNotification('Произошла ошибка при отправке заявки. Попробуйте еще раз или напишите нам в Telegram напрямую.', 'error');
            }
            
            // Reset button after 4 seconds
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.background = '#FFD700';
                submitBtn.style.borderColor = '#FFD700';
                submitBtn.style.color = '#101A26';
            }, 4000);
        });
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-family: 'IBM Plex Sans', sans-serif;
        font-weight: 500;
        font-size: 14px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        cursor: pointer;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    
    // Add click to dismiss
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Add CSS for animations
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize form input animations
function initFormAnimations() {
    const inputs = document.querySelectorAll('.form-input');
    
    inputs.forEach(input => {
        // Add focus/blur animations
input.addEventListener('focus', function() {
    this.style.borderBottomWidth = '2px';
});

input.addEventListener('blur', function() {
    this.style.borderBottomWidth = '1px';
});
        
        // Add typing animation
        input.addEventListener('input', function() {
            if (this.value.length > 0) {
                this.style.color = '#FFD700';
            } else {
                this.style.color = 'white';
            }
        });
    });
}

// Intersection Observer for animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe sections for scroll animations
    document.querySelectorAll('.leads-section, .services-section, .cases-section, .contact-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
}

// Mobile detection and class addition
function detectMobile() {
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile');
        document.querySelector('.container').classList.add('mobile-container');
    } else {
        document.body.classList.remove('mobile');
        document.querySelector('.container').classList.remove('mobile-container');
    }
}

// Call on load and resize
window.addEventListener('load', detectMobile);
window.addEventListener('resize', detectMobile);

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Open first accordion by default
    const firstAccordion = document.querySelector('.accordion-item');
    if (firstAccordion) {
        const firstContent = firstAccordion.querySelector('.accordion-content');
        const firstIcon = firstAccordion.querySelector('.accordion-icon');
        firstAccordion.classList.add('active');
        firstContent.classList.add('active');
        firstIcon.textContent = '−';
    }
    
    // Initialize all features
    handleFormSubmission();
    initSmoothScrolling();
    initFormAnimations();
    initScrollAnimations();
    
    // Add loading animation for images
    const images = document.querySelectorAll('.image-1, .image-2, .image-3, .case-image');
    images.forEach((img, index) => {
        img.style.opacity = '0';
        img.style.transform = 'scale(0.9)';
        img.style.transition = 'all 0.6s ease';
        
        setTimeout(() => {
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
        }, 200 * index);
    });
});

// Add some interactive features
function addInteractiveFeatures() {
    // Add hover effect to case items
document.querySelectorAll('.case-item').forEach(caseItem => {
    caseItem.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f9f9f9';
        this.style.padding = '15px';
        this.style.borderRadius = '8px';
        this.style.transition = 'all 0.3s ease';
    });
    
    caseItem.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.padding = '0';
        this.style.borderRadius = '0';
    });
});

    // Add click effect to buttons
    document.querySelectorAll('.cta-button, .learn-more-btn, .submit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

// Initialize interactive features after DOM load
document.addEventListener('DOMContentLoaded', addInteractiveFeatures);

// Add some performance optimizations
function optimizePerformance() {
    // Lazy load background images
    const imageElements = document.querySelectorAll('.case-image');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Don't override existing background images
                if (!entry.target.style.backgroundImage || entry.target.style.backgroundImage === 'none') {
                    const computedStyle = window.getComputedStyle(entry.target);
                    if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
                        // Image is already set in CSS, don't override
                    }
                }
                imageObserver.unobserve(entry.target);
            }
        });
    });
    
    imageElements.forEach(img => imageObserver.observe(img));
    
    // Debounce scroll events
    let scrollTimer;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            // Add scroll-based animations here if needed
        }, 100);
    });
}

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', optimizePerformance);