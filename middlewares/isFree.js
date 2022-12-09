const Chromium = require('chrome-aws-lambda');
const Promise = require('bluebird');
const hb = require('handlebars');
const inlineCss= require('inline-css');
const QRCode= require("qrcode");
const { config }= require('../utils/config');
const { client }= require('../utils/client');
const axios= require('axios');
const { urlFor } = require('../utils/image');
const { transporter } = require('../utils/nodemailer');

let options = {
  format: 'A4', printBackground: true, scale: 1, preferCSSPageSize: true
};

const isFree = async (req, res, next) => {
  const { evento, users, staff } = req.body;
  const projectId = config.projectId;
  const dataset = config.dataset;
  const tokenWithWriteAccess = process.env.SANITY_AUTH_TOKEN;
  try {
    const event = await client.fetch(
      `*[_type == "eventos" && _id == $idEvent]`,
      {
        idEvent: evento,
      }
    );

    console.log("entre a isFree");
    if (event[0].precio >= 1) {
      req.evento = event;
      next();
    } else if (event[0].precio === 0) {
      for (let i = 0; i < users.length; i++) {
        const { data } = await axios.post(
          `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}?returnIds=true`,
          {
            mutations: [
              {
                create: {
                  _type: "ticket",
                  cedula: users[i].cedula,
                  name: users[i].name,
                  genero: users[i].genero,
                  correo: users[i].correo,
                  edad: users[i].edad,
                  identificacion: users[i].identificacion,
                  empresa: users[i].empresa,
                  evento: {
                    _type: "reference",
                    _ref: evento,
                  },
                  activado: false,
                },
              },
            ],
          },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${tokenWithWriteAccess}`,
            },
          }
        );

        const resImage = await QRCode.toDataURL(
          `https://www.inputlatam.com/dashboard/entrada/${data.results[0].id}`
        );

        const dataOrderItem = await axios.post(
          `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}?returnIds=true`,
          {
            mutations: [
              {
                create: {
                  _type: "orderItem",
                  ticketsAvailable: 1,
                  evento: {
                    _type: "reference",
                    _ref: evento,
                  },
                  tickets: [{
                    _key: data.results[0].id,
                    _ref: data.results[0].id,
                  }],
                  imagesQR: [resImage],
                },
              },
            ],
          },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${tokenWithWriteAccess}`,
            },
          }
        );

          await axios.post(
          `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}?returnIds=true`,
          {
            mutations: [
              {
                create: {
                  _type: "order",
                  createdAt: new Date().toISOString(),
                  isPaid: true,
                  dayPay: new Date(),
                  paymentResult:"accredited",
                  price: 0,
                  quantity: 1,
                  evento: {
                    _type: "reference",
                    _ref: evento,
                  },
                  user: {
                    _type: "reference",
                    _ref: req.user._id,
                  },
                  staff: {
                    _type: "reference",
                    _ref: staff,
                  },
                  orderItem: {
                    _type: "reference",
                    _ref: dataOrderItem.data.results[0].id,
                  },
                },
              },
            ],
          },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${tokenWithWriteAccess}`,
            },
          }
        );

        await axios.post(
          `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}`,
          {
            mutations: [
              {
                patch: {
                  id: evento,
                  inc: {
                    ticketVendidos: 1,
                  },
                },
              },
            ],
          },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${tokenWithWriteAccess}`,
            },
          }
        );

       

        let file = {
          content: `<html>
            <head>
              <style>
                body {
                  margin: 0;
                }
              </style>
            </head>
            <body>
            <div style="width: 100%;height: 100%;background-color: rgb(52, 200, 113);padding: 50px;box-sizing: border-box;margin: 0;border: 0;">
            <h1 style="margin: 0px 0 10px 0;font-size: 55px;font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;">INPUT</h1>
            <div
                style="width: 100%;border: 9px solid black;background-color: white;padding: 50px 40px 20px 40px;box-sizing: border-box;">
                <h1 style="margin: 0;font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;font-size: 35px;">${
                  users[i].name
                }</h1>
                <div style="display: flex;flex-direction: row;justify-content: space-between;">
                    <div style="width: 50%;min-width: 50vh;">
                        <p style="font-size: 29px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Jueves 17 nov,2022</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Hora: ${
                          event[0].hora
                        }</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">${
                          event[0].lugar
                        },${event[0].ciudad}</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Acceso general: $0.00</p>
                        <img style="width: 70%;"
                        src="${resImage}" />
                    </div>
                    <div style="width: 50%;min-width: 50vh;">
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Titular: ${
                          users[i].name
                        }</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">ID: ${
                          data.results[0].id
                        }</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Ticket No. ${
                          event[0].totalTickets -
                          (event[0].totalTickets -
                            (i + 1 + event[0].ticketVendidos))
                        }</p>
                        <p style="font-size: 25px;margin: 10px 0;font-family: Arial, Helvetica, sans-serif;">Orden No. 882138</p>
                        <div>
                        <img style="width: 70%;border: 4px solid black;padding: 40px;box-sizing: border-box;"
                            src="${urlFor(event[0].image[0])}" />
                    </div>
                    </div>
                      
                </div>
            </div>
            <h3 style="color: white;font-size: 30px;font-family: Arial, Helvetica, sans-serif;font-weight: 300;">AVISO:</h3>
            <p style="font-size: 25px;font-family: Arial, Helvetica, sans-serif;">
            El titular de este ticket es el único responsable de su confidencialidad. Este código es válido para un
            único acceso y su duplicidad puede denegar el acceso si ya ha sido escaneado
            anteriormente. Ni el organizador del evento ni INPUT son responsables por cualquier inconveniente o pérdida
            por duplicación. En el caso de duplicación, el promotor se reserva el derecho de
            no permitir el acceso al portador de este ticket. Recuerda guardar este Ticket y llevarlo al evento con tu
            documento de identidad
              </p>
              </div>
              </body>
            </html>`,
            };

            console.log(file);

        async function generatePdf(file, options, callback) {

          try {
            
            const browser = await Chromium.puppeteer.launch({
              args: [...Chromium.args, "--hide-scrollbars", "--disable-web-security"],
              defaultViewport: Chromium.defaultViewport,
              executablePath: await Chromium.executablePath,
              headless: true,
              ignoreHTTPSErrors: true,
            })
            const page = await browser.newPage();
  
            if (file.content) {
              const dataChronium = await inlineCss(file.content, { url: "/" });
              // we have compile our code with handlebars
              const template = hb.compile(dataChronium, { strict: true });
              const result = template(dataChronium);
              const html = result;
  
              // We set the page content as the generated html by handlebars
              await page.setContent(html, {
                waitUntil: 'networkidle0', // wait for page to load completely
              });
            } else {
              await page.goto(file.url, {
                waitUntil: ['load', 'networkidle0'], // wait for page to load completely
              });
            }
  
            return Promise.props(page.pdf(options))
              .then(async function (dataChronium) {
                await browser.close();
  
                return Buffer.from(Object.values(dataChronium));
              }).asCallback(callback);
          } catch (error) {
            console.error(error);
          }

        }
        console.log("generando buffer pa");

        generatePdf(file, options).then(async pdfBuffer => {
          console.log('Generating PDF');
          await transporter.sendMail({
            from: `"inputlatam@gmail.com" <${process.env.CORREO_SECRET}>`, // sender address
            to: users[0].correo, // list of receivers
            subject: `inputlatam.com -> Entrada ${event[0].nombre}`, // Subject line
            text: "", // plain text body
            attachments: [
              {
                // binary buffer as an attachment
                filename: "Entrada.pdf",
                content: pdfBuffer,
              },
            ],
          });
        });
      }
      res.status(200).json({ global: "isFree" });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "error al mandar  correo" });
  }
};
module.exports = { isFree };
