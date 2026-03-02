package main

import (
	"log"
	"net"

	grpcTransport "messenger/backend/service"
	pb "messenger/messenger/api"

	"google.golang.org/grpc"
)

func main() {

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	server := grpcTransport.NewServer()

	pb.RegisterMessengerServiceServer(grpcServer, server)

	log.Println("gRPC server started on port :66668")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
