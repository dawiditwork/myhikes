const https = require('https');

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const postJson = (hostname, path, headers, payload) => new Promise((resolve, reject) => {
  const body = JSON.stringify(payload);
  const request = https.request({
    hostname,
    path,
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 10000
  }, response => {
    let responseBody = '';
    response.on('data', chunk => { responseBody += chunk; });
    response.on('end', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) return resolve();
      reject(new Error(`Email provider returned status ${response.statusCode}.`));
    });
  });
  request.on('timeout', () => request.destroy(new Error('Email provider timed out.')));
  request.on('error', reject);
  request.write(body);
  request.end();
});

const buildVerificationEmail = ({ name, verificationUrl }) => {
  const plainName = String(name || 'there').replace(/[\r\n]+/g, ' ').trim() || 'there';
  const safeName = escapeHtml(plainName);
  const safeUrl = escapeHtml(verificationUrl);
  const subject = 'Confirm your MyHikes account';
  const text = [
    `Hi ${plainName},`,
    '',
    'Welcome to MyHikes. Confirm your email address to activate your account:',
    verificationUrl,
    '',
    'This secure link expires in 24 hours.',
    'If you did not create a MyHikes account, you can safely ignore this email.',
    '',
    'MyHikes - Find your next trail.'
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#edf4f2;color:#173038;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirm your email and start discovering your next trail with MyHikes.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#edf4f2;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #d8e5e1;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(20,55,60,.10);">
            <tr>
              <td style="padding:34px 40px;background-color:#16363b;background-image:linear-gradient(135deg,#16363b 0%,#205a5b 58%,#2b7a70 100%);color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:29px;font-style:italic;font-weight:bold;letter-spacing:.3px;color:#ffffff;">MyHikes</td>
                    <td align="right" style="font-size:11px;font-weight:bold;letter-spacing:1.8px;color:#bde7dd;">WELCOME ABOARD</td>
                  </tr>
                </table>
                <div style="height:24px;line-height:24px;">&nbsp;</div>
                <div style="font-size:13px;font-weight:bold;letter-spacing:1.6px;color:#a8ddd2;text-transform:uppercase;">One last step</div>
                <h1 style="margin:9px 0 0;font-size:34px;line-height:1.16;font-weight:800;color:#ffffff;">Your next adventure<br>starts here.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:38px 40px 18px;">
                <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#173038;">Hi <strong>${safeName}</strong>,</p>
                <p style="margin:0;font-size:16px;line-height:1.65;color:#496168;">Thanks for joining MyHikes. Confirm your email address to activate your account and start discovering trails shared by the community.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 40px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#128173" style="border-radius:10px;box-shadow:0 7px 16px rgba(18,129,115,.22);">
                      <a href="${safeUrl}" style="display:inline-block;padding:15px 26px;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Confirm email&nbsp;&nbsp;&rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f8f6;border:1px solid #dceae6;border-radius:12px;">
                  <tr>
                    <td width="42" valign="top" style="padding:17px 0 17px 17px;font-size:20px;color:#128173;">&#9201;</td>
                    <td style="padding:16px 17px 16px 8px;font-size:13px;line-height:1.55;color:#587077;"><strong style="color:#29474d;">This link expires in 24 hours.</strong><br>If you did not create this account, no action is needed.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 36px;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#7b8f94;">Button not working? Copy and paste this address into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:1.55;word-break:break-all;"><a href="${safeUrl}" style="color:#128173;text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px;background-color:#102c31;color:#a9c1c2;">
                <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#d8e8e5;">Find it. Hike it. Remember it.</p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:#8fa9aa;">&copy; ${new Date().getFullYear()} MyHikes &bull; Transactional account email</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

const sendVerificationEmail = async ({ email, name, token }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (!apiKey || !from) throw new Error('Email delivery is not configured.');

  const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const message = buildVerificationEmail({ name, verificationUrl });

  await postJson('api.resend.com', '/emails', {
    Authorization: `Bearer ${apiKey}`
  }, {
    from,
    to: [email],
    ...message
  });
};

module.exports = { buildVerificationEmail, sendVerificationEmail };
