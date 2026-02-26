import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function PaperTypes() {
  const { paperBrandId } = useParams<{ paperBrandId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { cameraName = "", lensName = "", formatName = "", filmName = "", brandName = "" } =
    (location.state as {
      cameraName?: string;
      lensName?: string;
      formatName?: string;
      filmName?: string;
      brandName?: string;
    }) ?? {};
  const id = Number(paperBrandId);
  const utils = trpc.useUtils();
  const { data: types = [], isLoading } = trpc.paperTypes.list.useQuery({ paperBrandId: id });
  const createMutation = trpc.paperTypes.create.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });
  const deleteMutation = trpc.paperTypes.delete.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });
  const updateMutation = trpc.paperTypes.update.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });
  const copyMutation = trpc.paperTypes.copy.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });

  return (
    <HierarchyList
      title="인화지 종류"
      breadcrumb={[cameraName, lensName, formatName, filmName, brandName]}
      items={types}
      isLoading={isLoading}
      entityType="type"
      onItemPress={(item) =>
        navigate(`/browse/paper-sizes/${item.id}`, {
          state: { cameraName, lensName, formatName, filmName, brandName, typeName: item.name },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, paperBrandId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onPasteItem={(clipboardId) =>
        copyMutation.mutateAsync({ id: clipboardId, paperBrandId: id }).then(() => {})
      }
      emptyMessage="인화지 종류가 없습니다"
    />
  );
}
