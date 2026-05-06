using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class BusinessRule : BaseEntity
{
    public string RuleName { get; private set; } = null!;
    public RuleType RuleType { get; private set; }
    public string Description { get; private set; } = null!;
    public double LimitValue { get; private set; }
    public int PriorityLevel { get; private set; }
    public bool IsHardConstraint { get; private set; }

    private BusinessRule() { }

    public BusinessRule(
        Guid id,
        string ruleName,
        RuleType ruleType,
        string description,
        double limitValue,
        int priorityLevel,
        bool isHardConstraint) : base(id)
    {
        RuleName = ruleName;
        RuleType = ruleType;
        Description = description;
        LimitValue = limitValue;
        PriorityLevel = priorityLevel;
        IsHardConstraint = isHardConstraint;
    }

    public void Update(
        string ruleName,
        RuleType ruleType,
        string description,
        double limitValue,
        int priorityLevel,
        bool isHardConstraint)
    {
        RuleName = ruleName;
        RuleType = ruleType;
        Description = description;
        LimitValue = limitValue;
        PriorityLevel = priorityLevel;
        IsHardConstraint = isHardConstraint;
    }
}
