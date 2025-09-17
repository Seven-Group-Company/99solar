require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRouth');
const fileUploadRoute = require('./routes/fileUpload');
const lotRoute = require('./routes/lotRoute');
const bidRoute = require('./routes/bidRoute');
const reportRoute = require('./routes/reportRoute');
const filterRoute = require('./routes/filterRoute');

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false,
  })
);

const PORT = process.env.PORT || 1000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/files', fileUploadRoute);
app.use('/api/lots', lotRoute);
app.use('/api/bids', bidRoute);
app.use('/api/reports', reportRoute);
app.use('/api/filter', filterRoute);



app.get("/", (req, res) => {
  res.send("Hello, World!");
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});