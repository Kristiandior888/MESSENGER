const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync(
  __dirname + "/proto/messenger.proto",
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true
  }
);

const grpcObject = grpc.loadPackageDefinition(packageDef);

const messengerPackage = grpcObject.messenger;

const client = new messengerPackage.MessengerService(
  "localhost:5000",
  grpc.credentials.createInsecure()
);

module.exports = client;



