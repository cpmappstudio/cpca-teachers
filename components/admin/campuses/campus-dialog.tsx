"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Plus,
  Edit,
  ChevronDown,
  User,
  Upload,
  Trash2,
  ImageIcon,
  Loader2,
  X,
  GraduationCap,
  GripVertical,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { usStates, campusStatusOptions } from "@/lib/location-data";
import { getCitiesByState } from "@/lib/cities-data";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Grade type definition
type Grade = {
  name: string;
  code: string;
  level: number;
  category?: "prekinder" | "kinder" | "elementary" | "middle" | "high";
  isActive: boolean;
};

// Sortable Grade Badge Component
interface SortableGradeBadgeProps {
  grade: Grade;
  index: number;
  onRemove: (index: number) => void;
}

function SortableGradeBadge({ grade, index, onRemove }: SortableGradeBadgeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 w-full max-w-full"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded flex-shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Badge
        variant="outline"
        className="flex items-center gap-2 px-3 py-1.5 text-sm flex-1 min-w-0"
      >
        <GraduationCap className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{grade.name} ({grade.code})</span>
        {grade.category && (
          <span className="text-xs text-muted-foreground flex-shrink-0">- {grade.category}</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="ml-1 rounded-full hover:bg-muted p-0.5 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    </div>
  );
}

interface CampusDialogProps {
  campus?: Doc<"campuses">;
  trigger?: React.ReactNode;
}

export function CampusDialog({ campus, trigger }: CampusDialogProps) {
  const isEditing = !!campus;
  const router = useRouter();
  const locale = useLocale();

  // Clerk user
  const { user: clerkUser } = useUser();

  // Get current Convex user
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip",
  );

  // Mutations
  const createCampusMutation = useMutation(api.campuses.createCampus);
  const updateCampusMutation = useMutation(api.campuses.updateCampus);
  const deleteCampusMutation = useMutation(api.campuses.deleteCampus);
  const generateUploadUrl = useMutation(api.campuses.generateUploadUrl);
  const saveCampusImage = useMutation(api.campuses.saveCampusImage);
  const deleteCampusImage = useMutation(api.campuses.deleteCampusImage);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDirectorId, setSelectedDirectorId] = useState<
    Id<"users"> | undefined
  >(campus?.directorId || undefined);
  const [selectedState, setSelectedState] = useState<string>(
    campus?.address?.state || "",
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    campus?.address?.city || "",
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    campus?.status || "",
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteExistingImage, setDeleteExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grades state
  const [grades, setGrades] = useState<Grade[]>(campus?.grades || []);
  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeCode, setNewGradeCode] = useState("");
  const [newGradeCategory, setNewGradeCategory] = useState<string>("");
  const [useGradeTemplate, setUseGradeTemplate] = useState(false);

  // Grade template - Standard US education system
  const gradeTemplate: Grade[] = [
    // Pre-K
    { name: "Pre-K", code: "PK", level: 0, category: "prekinder", isActive: true },
    // Kindergarten
    { name: "K - 1", code: "K1", level: 1, category: "kinder", isActive: true },
    { name: "K - 2", code: "K2", level: 2, category: "kinder", isActive: true },
    // 1st Grade
    { name: "1st - 1", code: "1-1", level: 3, category: "elementary", isActive: true },
    { name: "1st - 2", code: "1-2", level: 4, category: "elementary", isActive: true },
    { name: "1st - 3", code: "1-3", level: 5, category: "elementary", isActive: true },
    { name: "1st - 4", code: "1-4", level: 6, category: "elementary", isActive: true },
    { name: "1st - 5", code: "1-5", level: 7, category: "elementary", isActive: true },
    { name: "1st - 6", code: "1-6", level: 8, category: "elementary", isActive: true },
    // 2nd Grade
    { name: "2nd - 1", code: "2-1", level: 9, category: "elementary", isActive: true },
    { name: "2nd - 2", code: "2-2", level: 10, category: "elementary", isActive: true },
    { name: "2nd - 3", code: "2-3", level: 11, category: "elementary", isActive: true },
    { name: "2nd - 4", code: "2-4", level: 12, category: "elementary", isActive: true },
    { name: "2nd - 5", code: "2-5", level: 13, category: "elementary", isActive: true },
    { name: "2nd - 6", code: "2-6", level: 14, category: "elementary", isActive: true },
    // 3rd Grade
    { name: "3rd - 1", code: "3-1", level: 15, category: "elementary", isActive: true },
    { name: "3rd - 2", code: "3-2", level: 16, category: "elementary", isActive: true },
    { name: "3rd - 3", code: "3-3", level: 17, category: "elementary", isActive: true },
    { name: "3rd - 4", code: "3-4", level: 18, category: "elementary", isActive: true },
    { name: "3rd - 5", code: "3-5", level: 19, category: "elementary", isActive: true },
    { name: "3rd - 6", code: "3-6", level: 20, category: "elementary", isActive: true },
    // 4th Grade
    { name: "4th - 1", code: "4-1", level: 21, category: "elementary", isActive: true },
    { name: "4th - 2", code: "4-2", level: 22, category: "elementary", isActive: true },
    { name: "4th - 3", code: "4-3", level: 23, category: "elementary", isActive: true },
    { name: "4th - 4", code: "4-4", level: 24, category: "elementary", isActive: true },
    { name: "4th - 5", code: "4-5", level: 25, category: "elementary", isActive: true },
    { name: "4th - 6", code: "4-6", level: 26, category: "elementary", isActive: true },
    // 5th Grade
    { name: "5th - 1", code: "5-1", level: 27, category: "elementary", isActive: true },
    { name: "5th - 2", code: "5-2", level: 28, category: "elementary", isActive: true },
    { name: "5th - 3", code: "5-3", level: 29, category: "elementary", isActive: true },
    { name: "5th - 4", code: "5-4", level: 30, category: "elementary", isActive: true },
    { name: "5th - 5", code: "5-5", level: 31, category: "elementary", isActive: true },
    { name: "5th - 6", code: "5-6", level: 32, category: "elementary", isActive: true },
    // 6th Grade
    { name: "6th - 1", code: "6-1", level: 33, category: "middle", isActive: true },
    { name: "6th - 2", code: "6-2", level: 34, category: "middle", isActive: true },
    { name: "6th - 3", code: "6-3", level: 35, category: "middle", isActive: true },
    { name: "6th - 4", code: "6-4", level: 36, category: "middle", isActive: true },
    { name: "6th - 5", code: "6-5", level: 37, category: "middle", isActive: true },
    { name: "6th - 6", code: "6-6", level: 38, category: "middle", isActive: true },
    // 7th Grade
    { name: "7th - 1", code: "7-1", level: 39, category: "middle", isActive: true },
    { name: "7th - 2", code: "7-2", level: 40, category: "middle", isActive: true },
    { name: "7th - 3", code: "7-3", level: 41, category: "middle", isActive: true },
    { name: "7th - 4", code: "7-4", level: 42, category: "middle", isActive: true },
    { name: "7th - 5", code: "7-5", level: 43, category: "middle", isActive: true },
    { name: "7th - 6", code: "7-6", level: 44, category: "middle", isActive: true },
    // 8th Grade
    { name: "8th - 1", code: "8-1", level: 45, category: "middle", isActive: true },
    { name: "8th - 2", code: "8-2", level: 46, category: "middle", isActive: true },
    { name: "8th - 3", code: "8-3", level: 47, category: "middle", isActive: true },
    { name: "8th - 4", code: "8-4", level: 48, category: "middle", isActive: true },
    { name: "8th - 5", code: "8-5", level: 49, category: "middle", isActive: true },
    { name: "8th - 6", code: "8-6", level: 50, category: "middle", isActive: true },
    // 9th Grade
    { name: "9th - 1", code: "9-1", level: 51, category: "high", isActive: true },
    { name: "9th - 2", code: "9-2", level: 52, category: "high", isActive: true },
    { name: "9th - 3", code: "9-3", level: 53, category: "high", isActive: true },
    { name: "9th - 4", code: "9-4", level: 54, category: "high", isActive: true },
    { name: "9th - 5", code: "9-5", level: 55, category: "high", isActive: true },
    { name: "9th - 6", code: "9-6", level: 56, category: "high", isActive: true },
    // 10th Grade
    { name: "10th - 1", code: "10-1", level: 57, category: "high", isActive: true },
    { name: "10th - 2", code: "10-2", level: 58, category: "high", isActive: true },
    { name: "10th - 3", code: "10-3", level: 59, category: "high", isActive: true },
    { name: "10th - 4", code: "10-4", level: 60, category: "high", isActive: true },
    { name: "10th - 5", code: "10-5", level: 61, category: "high", isActive: true },
    { name: "10th - 6", code: "10-6", level: 62, category: "high", isActive: true },
    // 11th Grade
    { name: "11th - 1", code: "11-1", level: 63, category: "high", isActive: true },
    { name: "11th - 2", code: "11-2", level: 64, category: "high", isActive: true },
    { name: "11th - 3", code: "11-3", level: 65, category: "high", isActive: true },
    { name: "11th - 4", code: "11-4", level: 66, category: "high", isActive: true },
    { name: "11th - 5", code: "11-5", level: 67, category: "high", isActive: true },
    { name: "11th - 6", code: "11-6", level: 68, category: "high", isActive: true },
    // 12th Grade
    { name: "12th - 1", code: "12-1", level: 69, category: "high", isActive: true },
    { name: "12th - 2", code: "12-2", level: 70, category: "high", isActive: true },
    { name: "12th - 3", code: "12-3", level: 71, category: "high", isActive: true },
    { name: "12th - 4", code: "12-4", level: 72, category: "high", isActive: true },
    { name: "12th - 5", code: "12-5", level: 73, category: "high", isActive: true },
    { name: "12th - 6", code: "12-6", level: 74, category: "high", isActive: true },
  ];

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Grade categories
  const gradeCategories = [
    { value: "prekinder", label: "Prekinder" },
    { value: "kinder", label: "Kinder" },
    { value: "elementary", label: "Elementary" },
    { value: "middle", label: "Middle School" },
    { value: "high", label: "High School" },
  ];

  // Query para obtener usuarios que pueden ser directores (admins y superadmins)
  const potentialDirectors = useQuery(api.admin.getPotentialDirectors);
  const selectedDirector = potentialDirectors?.find(
    (director) => director._id === selectedDirectorId,
  );

  // Get existing campus image URL if editing
  const existingImageUrl = useQuery(
    api.campuses.getImageUrl,
    campus?.campusImageStorageId ? { storageId: campus.campusImageStorageId } : "skip"
  );

  // Get available cities based on selected state
  const availableCities = getCitiesByState(selectedState);

  // Sync grades state when campus prop changes (only on initial load or campus change)
  // Don't sync during editing to preserve local changes
  useEffect(() => {
    if (campus?.grades && isOpen) {
      setGrades(campus.grades);
    }
  }, [campus?._id, isOpen]); // Only run when campus ID or dialog open state changes

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setDeleteExistingImage(false); // Cancel deletion if uploading new image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteExistingImage = () => {
    setDeleteExistingImage(true);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Grade template handler
  const handleUseGradeTemplate = (checked: boolean) => {
    setUseGradeTemplate(checked);
    if (checked) {
      setGrades(gradeTemplate);
      toast.success("Grade template loaded", {
        description: `${gradeTemplate.length} standard grades have been added. You can customize them as needed.`,
      });
    } else {
      setGrades([]);
    }
  };

  // Grade handlers
  const handleAddGrade = () => {
    if (!newGradeName.trim() || !newGradeCode.trim()) {
      toast.error("Validation Error", {
        description: "Grade name and code are required.",
      });
      return;
    }

    // Check for duplicate code
    const codeExists = grades.some(
      (grade) => grade.code.toLowerCase() === newGradeCode.trim().toLowerCase()
    );

    if (codeExists) {
      toast.error("Duplicate Grade Code", {
        description: `A grade with code "${newGradeCode.trim()}" already exists. Please use a different code.`,
      });
      return;
    }

    const newGrade: Grade = {
      name: newGradeName.trim(),
      code: newGradeCode.trim(),
      level: grades.length, // Level is based on current position
      category: newGradeCategory as "prekinder" | "kinder" | "elementary" | "middle" | "high" | undefined,
      isActive: true,
    };

    setGrades([...grades, newGrade]);
    setNewGradeName("");
    setNewGradeCode("");
    setNewGradeCategory("");
  };

  const handleRemoveGrade = (index: number) => {
    const updatedGrades = grades.filter((_, i) => i !== index);
    // Recalculate levels based on new order
    const reindexedGrades = updatedGrades.map((grade, idx) => ({
      ...grade,
      level: idx,
    }));
    setGrades(reindexedGrades);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGrades((items) => {
        const oldIndex = items.findIndex((_, idx) => idx === active.id);
        const newIndex = items.findIndex((_, idx) => idx === over.id);

        const reorderedGrades = arrayMove(items, oldIndex, newIndex);

        // Recalculate levels based on new order
        return reorderedGrades.map((grade, idx) => ({
          ...grade,
          level: idx,
        }));
      });
    }
  };

  // Upload image to Convex storage
  const uploadImage = async (file: File): Promise<Id<"_storage"> | null> => {
    try {
      // Step 1: Get a short-lived upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: POST the file to the upload URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      // Step 3: Get the storage ID from the response
      const { storageId } = await result.json();
      return storageId as Id<"_storage">;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Guardar referencia al formulario ANTES de cualquier operación asíncrona
    // Esto es necesario porque React recicla el SyntheticEvent después del await
    const form = event.currentTarget;

    // Validar que tengamos el usuario actual
    if (!currentUser?._id) {
      toast.error("User not authenticated", {
        description: "Please sign in again to continue.",
      });
      return;
    }

    const formData = new FormData(form);

    // Obtener datos del formulario
    const name = formData.get("name") as string;
    const code = formData.get("code") as string | null;
    const street = formData.get("street") as string | null;
    const zipCode = formData.get("zipCode") as string | null;

    // Validación básica
    if (!name?.trim()) {
      toast.error("Validation Error", {
        description: "Campus name is required.",
      });
      return;
    }

    if (!isEditing && !selectedStatus) {
      toast.error("Validation Error", {
        description: "Campus status is required.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle image deletion or replacement
      if (isEditing && campus?._id && campus?.campusImageStorageId) {
        // Delete existing image if:
        // 1. User explicitly marked it for deletion, OR
        // 2. User is uploading a new image to replace it
        if (deleteExistingImage || selectedImage) {
          await deleteCampusImage({
            campusId: campus._id,
            updatedBy: currentUser._id,
          });
        }
      }

      // Upload image first if a new one is selected
      let uploadedImageStorageId: Id<"_storage"> | null = null;
      if (selectedImage) {
        uploadedImageStorageId = await uploadImage(selectedImage);
      }

      if (isEditing) {
        // Actualizar campus existente
        if (!campus?._id) {
          toast.error("Error", {
            description: "Campus ID not found.",
          });
          return;
        }

        const updates: {
          name?: string;
          code?: string;
          campusImageStorageId?: Id<"_storage">;
          directorId?: Id<"users"> | null;
          directorName?: string;
          directorEmail?: string;
          directorPhone?: string;
          address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          };
          grades?: Array<{
            name: string;
            code: string;
            level: number;
            category?: "prekinder" | "kinder" | "elementary" | "middle" | "high";
            isActive: boolean;
          }>;
          status?: "active" | "inactive" | "maintenance";
        } = {};

        // Include new image if uploaded
        if (uploadedImageStorageId) {
          updates.campusImageStorageId = uploadedImageStorageId;
        }

        // Solo incluir campos que han cambiado
        if (name.trim() !== campus.name) {
          updates.name = name.trim();
        }

        // Code is not editable - skip update
        // if (code?.trim() !== campus.code) {
        //   updates.code = code?.trim() || undefined;
        // }

        if (selectedDirectorId !== campus.directorId) {
          // Send null instead of undefined to properly unassign director
          updates.directorId = selectedDirectorId || null;
          if (selectedDirectorId) {
            const director = potentialDirectors?.find(
              (d) => d._id === selectedDirectorId,
            );
            if (director) {
              updates.directorName = director.fullName;
              updates.directorEmail = director.email;
            }
          }
        }

        if (selectedStatus !== campus.status) {
          updates.status = selectedStatus as
            | "active"
            | "inactive"
            | "maintenance";
        }

        // Actualizar address si hay cambios
        const currentAddress = campus.address || {};
        const newAddress: {
          street?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          country?: string;
        } = {};

        let addressChanged = false;

        if ((street?.trim() || "") !== (currentAddress.street || "")) {
          newAddress.street = street?.trim() || undefined;
          addressChanged = true;
        }
        if (selectedCity !== (currentAddress.city || "")) {
          newAddress.city = selectedCity || undefined;
          addressChanged = true;
        }
        if (selectedState !== (currentAddress.state || "")) {
          newAddress.state = selectedState || undefined;
          addressChanged = true;
        }
        if ((zipCode?.trim() || "") !== (currentAddress.zipCode || "")) {
          newAddress.zipCode = zipCode?.trim() || undefined;
          addressChanged = true;
        }

        if (addressChanged) {
          updates.address = {
            ...newAddress,
            country: "United States",
          };
        }

        // Check if grades changed
        if (JSON.stringify(grades) !== JSON.stringify(campus.grades || [])) {
          // Always send the grades array, even if empty
          updates.grades = grades;
        }

        // Solo hacer la actualización si hay cambios o si se eliminó la imagen
        const hasChanges = Object.keys(updates).length > 0;
        const imageWasDeleted = deleteExistingImage && campus.campusImageStorageId;

        if (hasChanges || imageWasDeleted) {
          // Only call update if there are field changes
          if (hasChanges) {
            await updateCampusMutation({
              campusId: campus._id,
              updates,
              updatedBy: currentUser._id,
            });
          }

          toast.success("Campus updated successfully", {
            description: `"${name}" has been updated.`,
          });

          // Reset states
          setDeleteExistingImage(false);
          setSelectedImage(null);
          setImagePreview(null);

          // Cerrar el dialog automáticamente después del éxito
          setIsOpen(false);

          // Recargar la página para mostrar los cambios
          router.refresh();
        } else {
          toast.info("No changes detected", {
            description: "Please make changes before updating.",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Crear campus
        const campusData: {
          name: string;
          createdBy: Id<"users">;
          code?: string;
          campusImageStorageId?: Id<"_storage">;
          directorId?: Id<"users">;
          directorName?: string;
          directorEmail?: string;
          directorPhone?: string;
          address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          };
          grades?: Array<{
            name: string;
            code: string;
            level: number;
            category?: "prekinder" | "kinder" | "elementary" | "middle" | "high";
            isActive: boolean;
          }>;
        } = {
          name: name.trim(),
          createdBy: currentUser._id,
        };

        // Include uploaded image if available
        if (uploadedImageStorageId) {
          campusData.campusImageStorageId = uploadedImageStorageId;
        }

        // Campos opcionales
        if (code?.trim()) {
          campusData.code = code.trim();
        }

        if (selectedDirectorId) {
          const director = potentialDirectors?.find(
            (d) => d._id === selectedDirectorId,
          );
          campusData.directorId = selectedDirectorId;
          if (director) {
            campusData.directorName = director.fullName;
            campusData.directorEmail = director.email;
            // Note: phoneNumber not available from getPotentialDirectors query
          }
        }

        // Address (solo si hay al menos un campo)
        if (
          street?.trim() ||
          selectedCity ||
          selectedState ||
          zipCode?.trim()
        ) {
          campusData.address = {
            street: street?.trim() || undefined,
            city: selectedCity || undefined,
            state: selectedState || undefined,
            zipCode: zipCode?.trim() || undefined,
            country: "United States",
          };
        }

        // Grades (solo si hay al menos un grado)
        if (grades.length > 0) {
          campusData.grades = grades;
        }

        const campusId = await createCampusMutation(campusData);

        toast.success("Campus created successfully", {
          description: `"${name}" has been created.`,
        });

        // Resetear formulario usando la referencia guardada
        // Ahora usamos 'form' en lugar de 'event.currentTarget'
        form.reset();
        setSelectedDirectorId(undefined);
        setSelectedState("");
        setSelectedCity("");
        setSelectedImage(null);
        setImagePreview(null);
        setDeleteExistingImage(false);
        setGrades([]);
        setNewGradeName("");
        setNewGradeCode("");
        setNewGradeCategory("");

        // Cerrar el dialog automáticamente después del éxito
        setIsOpen(false);

        // Recargar la página para mostrar el nuevo campus
        // Usamos router.refresh() para refrescar los datos del servidor
        router.refresh();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save campus. Please try again.";
      toast.error("Error saving campus", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!campus) return;

    try {
      setIsSubmitting(true);
      await deleteCampusMutation({ campusId: campus._id });

      toast.success("Campus deleted successfully", {
        description: `"${campus.name}" has been deleted.`,
      });

      // Reset states
      setDeleteExistingImage(false);
      setSelectedImage(null);
      setImagePreview(null);

      // Cerrar el dialog
      setIsOpen(false);
      setShowDeleteAlert(false);

      // Redirigir a la página de listado de campuses con el locale correcto
      router.push(`/${locale}/admin/campuses`);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete campus. Please try again.";
      toast.error("Error deleting campus", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Default triggers si no se proporciona uno custom
  const defaultTrigger = isEditing ? (
    <Button className="gap-2 cursor-pointer">
      <Edit className="h-4 w-4" />
      Edit campus
    </Button>
  ) : (
    <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden md:inline">Add Campus</span>
    </Button>
  );

  return (
    <>
      <EntityDialog
        trigger={trigger || defaultTrigger}
        title={isEditing ? "Edit Campus" : "Create New Campus"}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Save changes" : "Create Campus"}
        isSubmitting={isSubmitting}
        open={isOpen}
        onOpenChange={setIsOpen}
        leftActions={
          isEditing ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              className="gap-2 min-w-[120px] text-white whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              Delete Campus
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-6">
          {/* Hidden inputs para los valores seleccionados */}
          <input
            type="hidden"
            name="directorId"
            value={selectedDirectorId || ""}
          />
          <input type="hidden" name="country" value="United States" />
          <input type="hidden" name="state" value={selectedState} />
          <input type="hidden" name="city" value={selectedCity} />
          <input type="hidden" name="status" value={selectedStatus} />

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="name">
                  Name
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={campus?.name || ""}
                  placeholder={isEditing ? "" : "Enter campus name"}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={campus?.code || ""}
                  placeholder="Enter campus code"
                  disabled={isEditing}
                  className={isEditing ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="status">
                  Status
                  <span className="text-red-500">*</span>
                </Label>
                <SelectDropdown
                  options={campusStatusOptions}
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value)}
                  placeholder="Select status..."
                  label="Status Options"
                />
              </div>
              <div className="grid gap-3">
                <Label>Director</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedDirector ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {selectedDirector.fullName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Select a director
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80" align="start">
                    <DropdownMenuLabel>Available Directors</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {potentialDirectors?.length === 0 ? (
                      <DropdownMenuItem disabled>
                        No directors available
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => setSelectedDirectorId(undefined)}
                          className={!selectedDirectorId ? "bg-accent" : ""}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>No director assigned</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {potentialDirectors?.map((director) => (
                          <DropdownMenuItem
                            key={director._id}
                            onClick={() => setSelectedDirectorId(director._id)}
                            className={
                              selectedDirectorId === director._id
                                ? "bg-accent"
                                : ""
                            }
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">
                                  {director.fullName}
                                </span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  {director.role}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground ml-6">
                                {director.email}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {potentialDirectors === undefined && (
                  <div className="text-sm text-muted-foreground">
                    Loading available directors...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grades Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Grades Offered</h4>
            <div className="grid gap-4">
              {/* Use Grade Template Checkbox - Only show when creating */}
              {!isEditing && (
                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                  <Checkbox
                    id="useGradeTemplate"
                    checked={useGradeTemplate}
                    onCheckedChange={handleUseGradeTemplate}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="useGradeTemplate"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Use standard grade template
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Load all standard grades from Pre-K to 12th grade (75 grades total)
                    </p>
                  </div>
                </div>
              )}

              {/* Display existing grades with drag & drop */}
              {grades.length > 0 && (
                <div className="space-y-3 overflow-hidden">
                  <Label>Current Grades ({grades.length}) - Drag to reorder</Label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={grades.map((_, index) => index)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2 w-full overflow-hidden">
                        {grades.map((grade, index) => (
                          <SortableGradeBadge
                            key={index}
                            grade={grade}
                            index={index}
                            onRemove={handleRemoveGrade}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}

              {/* Add new grade form */}
              <div className="space-y-3">
                <Label className="text-sm">Add New Grade</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="gradeName" className="text-xs">
                      Name<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="gradeName"
                      value={newGradeName}
                      onChange={(e) => setNewGradeName(e.target.value)}
                      placeholder="e.g., Prekinder, 1st Grade"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gradeCode" className="text-xs">
                      Code<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="gradeCode"
                      value={newGradeCode}
                      onChange={(e) => setNewGradeCode(e.target.value)}
                      placeholder="e.g., PK, G1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gradeCategory" className="text-xs">
                      Category
                    </Label>
                    <SelectDropdown
                      options={gradeCategories}
                      value={newGradeCategory}
                      onValueChange={(value) => setNewGradeCategory(value)}
                      placeholder="Select..."
                      label="Grade Categories"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddGrade}
                  className="gap-2 self-start"
                >
                  <Plus className="h-4 w-4" />
                  Add Grade
                </Button>
              </div>
            </div>
          </div>

          {/* Campus Image */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Campus Image</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image Preview */}
              <div className="space-y-3">
                <Label>{isEditing ? "Current Image" : "Preview"}</Label>
                <AspectRatio ratio={1} className="bg-muted rounded-lg">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Campus preview"
                      fill
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : existingImageUrl && !deleteExistingImage ? (
                    <Image
                      src={existingImageUrl}
                      alt="Current campus image"
                      fill
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        No Image
                      </span>
                    </div>
                  )}
                </AspectRatio>
              </div>

              {/* Upload Controls */}
              <div className="space-y-4 lg:col-span-2">
                <div className="space-y-3">
                  <Label>
                    {isEditing ? "Upload New Image" : "Upload Campus Image"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose a square image that represents your campus. Recommended
                    size: 400x400px or larger.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileUpload}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>

                  {(selectedImage || imagePreview) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImageRemove}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  )}

                  {existingImageUrl && !deleteExistingImage && !imagePreview && isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteExistingImage}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Current Image
                    </Button>
                  )}
                </div>

                {selectedImage && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedImage.name} (
                    {Math.round(selectedImage.size / 1024)}KB)
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">Address</h4>
            <div className="grid gap-4">
              {/* Country - First */}
              <div className="grid gap-3">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value="United States"
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* State and City - Second row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="state">
                    State
                  </Label>
                  <SelectDropdown
                    options={usStates}
                    value={selectedState}
                    onValueChange={(value) => {
                      setSelectedState(value);
                      // Reset city when state changes
                      setSelectedCity("");
                    }}
                    placeholder="Select state..."
                    label="US States"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="city">City</Label>
                  <SelectDropdown
                    options={availableCities}
                    value={selectedCity}
                    onValueChange={(value) => setSelectedCity(value)}
                    placeholder={
                      availableCities.length > 0
                        ? "Select city..."
                        : "Select state first"
                    }
                    label={
                      availableCities.length > 0 ? "Available Cities" : undefined
                    }
                    disabled={availableCities.length === 0}
                  />
                  {availableCities.length === 0 && selectedState && (
                    <p className="text-xs text-muted-foreground">
                      No major cities available for selected state
                    </p>
                  )}
                </div>
              </div>

              {/* Street - Third row */}
              <div className="grid gap-3">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  name="street"
                  defaultValue={campus?.address?.street || ""}
                  placeholder={isEditing ? "" : "Enter street adress"}
                />
              </div>

              {/* ZIP Code - Fourth row */}
              <div className="grid gap-3">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  defaultValue={campus?.address?.zipCode || ""}
                  placeholder={isEditing ? "" : "Enter ZIP code"}
                />
              </div>
            </div>
          </div>
        </div>
      </EntityDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campus
              &quot;{campus?.name}&quot; and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive !text-white text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Campus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
