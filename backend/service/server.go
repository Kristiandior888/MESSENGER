package grpc

import (
	"context"
	"log"

	pb "messenger/messenger/api"
)

type Server struct {
	pb.UnimplementedMessengerServiceServer
}

func NewServer() *Server {
	return &Server{}
}

func (s *Server) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.SendMessageResponse, error) {

	log.Printf("Received message for chat %s: %s", req.ChatId, req.Text)

	return &pb.SendMessageResponse{
		Success: true,
	}, nil
}
