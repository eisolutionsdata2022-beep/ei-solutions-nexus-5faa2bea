export function PortalFooter() {
  return (
    <>
      <div className="flex h-1">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>
      <footer className="bg-gov-blue text-white py-3 px-6 text-center text-sm">
        All Rights Reserved &bull; Contact Support : <span className="font-bold">1800-111-1111</span>
      </footer>
    </>
  );
}
