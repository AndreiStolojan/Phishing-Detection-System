const welcomeTemplate = (userName, createdAt) => ({
  subject: `Bine ai venit, ${userName}! 🎉`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
          <div style="width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 20px; line-height: 80px; font-size: 36px; font-weight: bold; color: #667eea;">
            ${userName.charAt(0).toUpperCase()}
          </div>
          <h1 style="color: white; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px;">
            Bine ai venit, ${userName}!
          </h1>
        </div>

        <div style="background-color: white; border-radius: 0 0 16px 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <h2 style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-top: 0; font-size: 20px;">
            🎊 Contul tău a fost creat cu succes!
          </h2>

          <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #555; line-height: 1.6;">
            Suntem încântați să te avem alături de noi. Contul tău este acum activ și gata de utilizare.
          </p>

          <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; font-family: 'Segoe UI', Arial, sans-serif;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #666;">
                  👤 Nume
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #333; font-weight: 600; text-align: right;">
                  ${userName}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #666;">
                  📅 Data înregistrării
                </td>
                <td style="padding: 12px 0; color: #333; font-weight: 600; text-align: right;">
                  ${createdAt}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #666; font-size: 14px;">
              Dacă ai întrebări, nu ezita să ne contactezi! 💬
            </p>
          </div>

        </div>

        <p style="text-align: center; font-family: 'Segoe UI', Arial, sans-serif; color: #999; font-size: 12px; margin-top: 30px;">
          © 2026 Toate drepturile rezervate
        </p>

      </div>
    </body>
    </html>
  `
});

export default welcomeTemplate;
