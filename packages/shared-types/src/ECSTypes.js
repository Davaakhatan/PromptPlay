// Component type markers
export var ComponentType;
(function (ComponentType) {
    ComponentType[ComponentType["Transform"] = 0] = "Transform";
    ComponentType[ComponentType["Velocity"] = 1] = "Velocity";
    ComponentType[ComponentType["Sprite"] = 2] = "Sprite";
    ComponentType[ComponentType["Collider"] = 3] = "Collider";
    ComponentType[ComponentType["Input"] = 4] = "Input";
    ComponentType[ComponentType["Health"] = 5] = "Health";
    ComponentType[ComponentType["AIBehavior"] = 6] = "AIBehavior";
})(ComponentType || (ComponentType = {}));
//# sourceMappingURL=ECSTypes.js.map