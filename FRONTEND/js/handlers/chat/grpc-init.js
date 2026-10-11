// js/handlers/chat/grpc-init.js
let grpcService;

export async function initGrpc() {
    if (!grpcService) {
        const serviceModule = await import('../../grpc/grpc-service.js');
        grpcService = serviceModule.default || serviceModule;
    }
    return { service: grpcService };
}