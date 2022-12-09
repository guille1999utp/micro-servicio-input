const express = require("express");
const axios = require("axios");
const app = express();
const cors = require("cors");
const { mercadopago } = require("./mercadopago/index");
const { client } = require("./utils/client");
const { isFree } = require("./middlewares/isFree");
const { isAuth } = require("./middlewares/auth");
app.use(cors());
app.use(express.json());
app.use(isAuth)
app.use(isFree);



app.post("/mercadopago", async (req, res) => {
  console.log("entro", req.body);
  const { evento, users, staff, ...resBody } = req.body;
  const projectId = config.projectId;
  const dataset = config.dataset;
  const tokenWithWriteAccess = process.env.SANITY_AUTH_TOKEN;
  let qrCodesId = [];
  let qrImagesId = [];
  try {
    const Event = await client.fetch(
      `*[_type == "eventos" && _id == $idEvent]`,
      {
        idEvent: evento,
      }
    );

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
      qrCodesId.push({
        _key: data.results[0].id,
        _ref: data.results[0].id,
      });

      const resImage = await QRCode.toDataURL(
        `https://www.inputlatam.com/pruebaQR/${data.results[0].id}`
      );
      qrImagesId.push(resImage);
    }
    const { data } = await axios.post(
      `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}?returnIds=true`,
      {
        mutations: [
          {
            create: {
              _type: "orderItem",
              ticketsAvailable: parseInt(resBody.quantity),
              evento: {
                _type: "reference",
                _ref: evento,
              },
              tickets: qrCodesId,
              imagesQR: qrImagesId,
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
    const resOrder = await axios.post(
      `https://${projectId}.api.sanity.io/v1/data/mutate/${dataset}?returnIds=true`,
      {
        mutations: [
          {
            create: {
              _type: "order",
              createdAt: new Date().toISOString(),
              isPaid: false,
              price: Event[0].precio * parseInt(resBody.quantity),
              quantity: parseInt(resBody.quantity),
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
                _ref: data.results[0].id,
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

    let preference = {
      metadata: { id_shop: resOrder.data.results[0].id },
      items: [
        {
          title: Event[0].nombre,
          unit_price: Event[0].precio,
          quantity: parseInt(resBody.quantity),
          description: Event[0].artista,
        },
      ],
    };

    const response = await mercadopago.preferences.create(preference);
    console.log(response);

    res.status(200).json({ global: response.body.id });
  } catch (error) {
    console.log(error);
  }
});

app.listen(5000, () => {
  console.log("server started on port 5000");
});
