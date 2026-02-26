import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function PaperSizes() {
  const { paperTypeId } = useParams<{ paperTypeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cameraName = "",
    lensName = "",
    formatName = "",
    filmName = "",
    brandName = "",
    typeName = "",
  } = (location.state as {
    cameraName?: string;
    lensName?: string;
    formatName?: string;
    filmName?: string;
    brandName?: string;
    typeName?: string;
  }) ?? {};
  const id = Number(paperTypeId);
  const utils = trpc.useUtils();
  const { data: sizes = [], isLoading } = trpc.paperSizes.list.useQuery({ paperTypeId: id });
  const createMutation = trpc.paperSizes.create.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });
  const deleteMutation = trpc.paperSizes.delete.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });
  const updateMutation = trpc.paperSizes.update.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });
  const copyMutation = trpc.paperSizes.copy.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });

  return (
    <HierarchyList
      title="인화지 사이즈"
      breadcrumb={[cameraName, lensName, formatName, filmName, brandName, typeName]}
      items={sizes}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/print-data-list/${item.id}`, {
          state: {
            cameraName,
            lensName,
            formatName,
            filmName,
            brandName,
            typeName,
            sizeName: item.name,
          },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, paperTypeId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onDuplicateItem={(item) =>
        copyMutation.mutateAsync({ id: item.id, paperTypeId: id }).then(() => {})
      }
      emptyMessage="인화지 사이즈가 없습니다"
    />
  );
}
