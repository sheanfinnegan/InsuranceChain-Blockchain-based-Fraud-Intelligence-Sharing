import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['pg', '@hyperledger/fabric-gateway', '@grpc/grpc-js'],
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
};
export default config;
