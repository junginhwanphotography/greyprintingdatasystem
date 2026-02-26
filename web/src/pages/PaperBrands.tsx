import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function PaperBrands() {
  const { filmTypeId } = useParams<{ filmTypeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { cameraName = "", lensName = "", formatName = "", filmName = "" } =
    (location.state as { cameraName?: string; lensName?: string; formatName?: string; filmName?: string }) ?? {};
  const id = Number(filmTypeId);
  const utils = trpc.useUtils();
  const { data: brands = [], isLoading } = trpc.paperBrands.list.useQuery({ filmTypeId: id });
  const createMutation = trpc.paperBrands.create.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });
  const deleteMutation = trpc.paperBrands.delete.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });
  const updateMutation = trpc.paperBrands.update.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });
  const copyMutation = trpc.paperBrands.copy.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });

  return (
    <HierarchyList
      title="인화지 브랜드"
      breadcrumb={[cameraName, lensName, formatName, filmName]}
      items={brands}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/paper-types/${item.id}`, {
          state: { cameraName, lensName, formatName, filmName, brandName: item.name },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, filmTypeId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onDuplicateItem={(item) =>
        copyMutation.mutateAsync({ id: item.id, filmTypeId: id }).then(() => {})
      }
      emptyMessage="인화지 브랜드가 없습니다"
    />
  );
}
