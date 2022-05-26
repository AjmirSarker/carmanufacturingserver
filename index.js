
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://arafat512:<password>@cluster0.fx9pl.mongodb.net/?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fx9pl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// function verifyJWT(req, res, next) {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return res.status(401).send({ message: 'UnAuthorized access' });
//     }
//     const token = authHeader.split(' ')[1];
//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//       if (err) {
//         return res.status(403).send({ message: 'Forbidden access' })
//       }
//       req.decoded = decoded;
//       next();
//     });
//   }

async function run(){
    try {
        await client.connect();
        const productCollection = client.db('bestbuy').collection('products');
        const reviewCollection=client.db('bestbuy').collection('reviews');
        const userCollection=client.db('bestbuy').collection('users')
        const orderCollection=client.db('bestbuy').collection('orders')
        const profileCollection=client.db('bestbuy').collection('profiles')
        const paymentCollection=client.db('bestbuy').collection('payments')



        //payment-intent
        app.post('/create-payment-intent', async(req, res) =>{
          const service = req.body;
          const price = service.totalPrice;
          const amount = price*100;
          const paymentIntent = await stripe.paymentIntents.create({
            amount : amount,
            currency: 'usd',
            payment_method_types:['card']
          });
          res.send({clientSecret: paymentIntent.client_secret})
        });
    
        // product
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });
         // update product
    app.put('/products/:id', async (req, res) => {
      const id = req.params;
      const updatedProduct = req.body;
     
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: updatedProduct.quantity
        }
      };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
        //get product by id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
          });
          //get products by name
          app.get('/product',async(req,res)=>{
            const name= req.query.name;
            const query = {name:name};
            const tasks = await productCollection.find(query).toArray();
               console.log(tasks);
            res.send(tasks);
        })
           //get order by email
           app.get('/individual',async(req,res)=>{
            const email = req.query.email;
          
           const query={email:email}
            const tasks = await orderCollection.find(query).toArray();
            res.send(tasks);
        })
          //allreviews
          app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        //add reviews
        app.post('/reviews', async (req, res) => {
            const newProduct = req.body;
            const result = await reviewCollection.insertOne(newProduct);
            res.send(result);
        });
        app.get('/users',async(req,res)=>{
          const users = await userCollection.find().toArray()
          res.send(users)
        })
        //user put
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send( {result,token} );
          })
          //admin check
          app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
          })
          //admin user
          app.put('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const requesterAccount = await  userCollection.findOne({email:email})
            if(requesterAccount.role==='admin'){
              const filter = { email: email };  
              const updateDoc = {
                $set: {role:'admin'},
              };
              const result = await userCollection.updateOne(filter, updateDoc);
             
              res.send( result );
            }else{
              res.status(403).send({message:'forbidden'})
            }
            
          })
          app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const cursor = userCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
          //getOrders
          app.get('/orders', async (req, res) => {
            const query = {};
           
            const cursor = orderCollection.find(query);
            const order = await cursor.toArray();
            res.send(order);
        });


          //postOrders
          app.post('/orders', async (req, res) => {
            const newOrder = req.body;
            const result = await orderCollection.insertOne(newOrder);
            res.send(result);
        });
     
      //order delete
      app.delete('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);
      });
      // order by id get
      app.get('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.findOne(query);
        res.send(result);
      });
      //update order
      app.patch('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const payment = req.body
        const filter= { _id: ObjectId(id) };

        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId
          }
      }
      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedBooking);
    });

      //profile 
      app.get('/profile', async (req, res) => {
        const query = {};
        const cursor = profileCollection.find(query);
        const items = await cursor.toArray();
        res.send(items);
    });
       //get profile by email
    //    app.get('/profile',async(req,res)=>{
        
      
    //    const query={email:email}
    //     const tasks = await profileCollection.find(query).toArray();
    //     res.send(tasks);
    // })
       // update product
       
          // update profile
    app.put('/profile/:id', async (req, res) => {
      const id=req.params
      const updatedProfile = req.body;
      console.log(updatedProfile);
     
      const filter = {  _id: ObjectId(id)};
      const options = { upsert: true };
      const updateDoc = {
        $set:updatedProfile 
      };
      const result = await updatedProfile.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });
    
    }finally{

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server Running');
});

app.listen(port, () => {
    console.log('Listening to port', port);
})
