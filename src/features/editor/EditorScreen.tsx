export function EditorScreen({ projectId }: { projectId: string }) {
  return (
    <div className="page">
      <h1 className="display" tabIndex={-1}>Editor: {projectId}</h1>
      <p className="muted">Llega en la siguiente fase.</p>
    </div>
  );
}
