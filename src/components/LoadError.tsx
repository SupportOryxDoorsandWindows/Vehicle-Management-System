export function LoadError({ what, message }: { what: string; message: string }) {
  return (
    <div role="alert" className="border border-red-300 bg-red-50 text-red-700 rounded-lg p-4">
      <p className="font-semibold">Couldn't load {what}.</p>
      <p className="text-sm">{message}</p>
      <p className="text-sm mt-1">
        Refresh the page to try again. If this keeps happening, contact your administrator.
      </p>
    </div>
  );
}
