const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем принимать JSON в запросах
app.use(express.json());

// Создаём транспорт для отправки писем
let transporter = null;

// Функция для инициализации транспорта
function initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('✅ SMTP транспорт настроен');
    } else {
        console.log('⚠️ SMTP не настроен, отправка писем недоступна');
    }
}

// Эндпоинт для проверки работоспособности сервера
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Сервер работает!' });
});

// Эндпоинт для отправки письма
app.post('/send-email', async (req, res) => {
    const { to, subject, text, html } = req.body;
    
    // Проверяем обязательные поля
    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ 
            error: 'Не хватает полей. Нужны: to, subject, и text или html' 
        });
    }
    
    // Проверяем настроен ли транспорт
    if (!transporter) {
        return res.status(500).json({ 
            error: 'SMTP не настроен. Добавьте переменные окружения' 
        });
    }
    
    try {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@myapp.com',
            to: to,
            subject: subject,
            text: text || '',
            html: html || ''
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Письмо отправлено:', info.messageId);
        res.json({ 
            success: true, 
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

// Простая контактная форма
app.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Заполните все поля: name, email, message' });
    }
    
    if (!transporter) {
        return res.status(500).json({ error: 'SMTP не настроен' });
    }
    
    try {
        await transporter.sendMail({
            from: `"${name}" <${email}>`,
            to: process.env.ADMIN_EMAIL || 'admin@myapp.com',
            subject: `Новое сообщение от ${name}`,
            text: `От: ${name} (${email})\n\nСообщение:\n${message}`,
            replyTo: email
        });
        
        res.json({ success: true, message: 'Сообщение отправлено!' });
        
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
});

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📧 Тестовый эндпоинт: POST http://localhost:${PORT}/send-email`);
    console.log(`📞 Контактная форма: POST http://localhost:${PORT}/contact`);
    console.log(`💚 Проверка здоровья: GET http://localhost:${PORT}/health`);
    
    // Инициализируем SMTP после запуска
    initTransporter();
});