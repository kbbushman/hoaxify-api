const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@any-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
      <div>
        <p>
          <strong>Please click the link below to activate your account</strong>
        </p>
      </div>
      <div>
        <p>
          <a href="http://localhost:8080/#/login?token=${token}">Activate Account</a>
        </p>
      </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `ACCOUNT ACTIVATION URL: ${nodemailer.getTestMessageUrl(info)}`
    );
  }
};

module.exports = {
  sendAccountActivation,
};
