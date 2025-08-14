<?php
// telegram-sender.php - Backend для безопасной отправки в Telegram

// Load environment variables
function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception('.env file not found');
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Skip comments
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Load .env file
try {
    loadEnv('.env');
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration error']);
    exit;
}

// Get configuration from environment
$BOT_TOKEN = getenv('TELEGRAM_BOT_TOKEN');
$CHAT_ID = getenv('TELEGRAM_CHAT_ID');
$SITE_DOMAIN = getenv('SITE_DOMAIN');
$RATE_LIMIT = (int)getenv('RATE_LIMIT_SECONDS') ?: 30;
$MAX_MESSAGE_LENGTH = (int)getenv('MAX_MESSAGE_LENGTH') ?: 1000;
$DEBUG_MODE = getenv('DEBUG_MODE') === 'true';
$LOG_SUBMISSIONS = getenv('LOG_SUBMISSIONS') === 'true';

// Validate required environment variables
if (!$BOT_TOKEN || !$CHAT_ID) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Missing configuration']);
    exit;
}

// CORS headers
header('Content-Type: application/json');
if ($DEBUG_MODE) {
    // For local development
    header('Access-Control-Allow-Origin: *');
} else {
    // For production - replace with your domain
    header('Access-Control-Allow-Origin: https://' . $SITE_DOMAIN);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Rate limiting
session_start();
$now = time();
$last_submission = $_SESSION['last_submission'] ?? 0;

if ($now - $last_submission < $RATE_LIMIT) {
    http_response_code(429);
    echo json_encode([
        'success' => false, 
        'message' => "Слишком много запросов. Попробуйте через {$RATE_LIMIT} секунд."
    ]);
    exit;
}

// Get and validate input data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

$name = trim($input['name'] ?? '');
$contact = trim($input['contact'] ?? '');
$message = trim($input['message'] ?? '');

// Validation
if (empty($name) || empty($contact)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Имя и Telegram обязательны']);
    exit;
}

// Validate name (only letters and spaces, 2-50 characters)
if (strlen($name) < 2 || strlen($name) > 50 || !preg_match('/^[а-яёА-ЯЁa-zA-Z\s]+$/u', $name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Некорректное имя']);
    exit;
}

// Validate Telegram username
$contact = str_replace('@', '', $contact); // Remove @ if present
if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/', $contact)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Некорректный Telegram username']);
    exit;
}

// Sanitize message
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
if (strlen($message) > $MAX_MESSAGE_LENGTH) {
    $message = substr($message, 0, $MAX_MESSAGE_LENGTH) . '...';
}

// Create Telegram message
$telegram_message = "🚀 <b>Новая заявка с сайта LeadBoost!</b>\n\n";
$telegram_message .= "👤 <b>Имя:</b> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "\n";
$telegram_message .= "📱 <b>Telegram:</b> @" . htmlspecialchars($contact, ENT_QUOTES, 'UTF-8') . "\n";
$telegram_message .= "💬 <b>Сообщение:</b> " . ($message ?: 'Не указано') . "\n\n";
$telegram_message .= "📅 <b>Дата:</b> " . date('d.m.Y H:i:s') . "\n";
$telegram_message .= "🌐 <b>Источник:</b> " . getenv('SITE_NAME') . "\n";
$telegram_message .= "🔗 <b>IP:</b> " . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR']);

// Debug mode - log the message
if ($DEBUG_MODE) {
    error_log("Debug: Sending message to Telegram: " . $telegram_message);
}

// Send to Telegram
$url = "https://api.telegram.org/bot{$BOT_TOKEN}/sendMessage";

$data = [
    'chat_id' => $CHAT_ID,
    'text' => $telegram_message,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true
];

$options = [
    'http' => [
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data),
        'timeout' => 10
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === false) {
    // Log error
    error_log("Telegram API request failed for user: {$name}");
    
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка отправки сообщения']);
    exit;
}

$response = json_decode($result, true);

if ($response && $response['ok']) {
    // Success - update session
    $_SESSION['last_submission'] = $now;
    
    // Log successful submission
    if ($LOG_SUBMISSIONS) {
        error_log("Form submitted successfully: {$name} (@{$contact})");
    }
    
    echo json_encode(['success' => true, 'message' => 'Заявка успешно отправлена']);
} else {
    // Telegram API error
    $error_msg = $response['description'] ?? 'Unknown error';
    error_log("Telegram API error: " . $error_msg);
    
    if ($DEBUG_MODE) {
        echo json_encode(['success' => false, 'message' => 'Telegram API error: ' . $error_msg]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Ошибка отправки в Telegram']);
    }
}
?>